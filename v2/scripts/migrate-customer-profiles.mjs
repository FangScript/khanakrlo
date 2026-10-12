// Offline operator job only. Runtime services never use another service's credentials.
// Stop Identity's old phone writer before running. No plaintext phone is read or logged.
import pg from "pg";
if (process.env.PROFILE_MIGRATION_WRITES_PAUSED !== "true") throw new Error("Pause old Identity phone writes and set PROFILE_MIGRATION_WRITES_PAUSED=true.");
if (!process.env.IDENTITY_DATABASE_URL || !process.env.CUSTOMER_DATABASE_URL) throw new Error("Both migration database URLs are required.");
const options = { ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: true } : undefined };
const source = new pg.Client({ ...options, connectionString: process.env.IDENTITY_DATABASE_URL });
const target = new pg.Client({ ...options, connectionString: process.env.CUSTOMER_DATABASE_URL });
try {
  await source.connect();
  await target.connect();
  let cursor = "00000000-0000-0000-0000-000000000000", copied = 0;
  for (;;) {
    const page = await source.query("SELECT id, display_name, phone_ciphertext, phone_nonce, phone_last_four, phone_consent_at FROM identity_users WHERE id>$1 ORDER BY id LIMIT 200", [cursor]);
    if (!page.rowCount) break;
    await target.query("BEGIN");
    try {
      for (const row of page.rows) {
        // Never overwrite data already captured by Customer, including a newer phone consent.
        await target.query("INSERT INTO customer_profiles (user_id,display_name,phone_ciphertext,phone_nonce,phone_last_four,phone_consent_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (user_id) DO NOTHING", [row.id,row.display_name ?? "",row.phone_ciphertext,row.phone_nonce,row.phone_last_four,row.phone_consent_at]);
        const result = await target.query("SELECT phone_ciphertext,phone_nonce,phone_consent_at FROM customer_profiles WHERE user_id=$1", [row.id]);
        const saved = result.rows[0];
        if (!saved || (row.phone_consent_at && (!saved.phone_consent_at || saved.phone_consent_at < row.phone_consent_at))) throw new Error("An existing Customer profile needs manual conflict resolution; no data was overwritten.");
        if (row.phone_consent_at && saved.phone_consent_at?.getTime() === row.phone_consent_at.getTime() && (!saved.phone_ciphertext?.equals(row.phone_ciphertext) || !saved.phone_nonce?.equals(row.phone_nonce))) throw new Error("Encrypted phone verification failed.");
      }
      await target.query("COMMIT");
    } catch (error) { await target.query("ROLLBACK"); throw error; }
    cursor = page.rows.at(-1).id;
    copied += page.rowCount;
  }
  console.log(`Verified ${copied} customer profiles. Source data retained; cleanup requires a separate reviewed migration.`);
} finally {
  await source.end().catch(() => undefined);
  await target.end().catch(() => undefined);
}
