-- Customer-owned profile and contact details live in Customer, not Identity.
ALTER TABLE identity_users
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS display_name,
  DROP COLUMN IF EXISTS phone_ciphertext,
  DROP COLUMN IF EXISTS phone_nonce,
  DROP COLUMN IF EXISTS phone_last_four,
  DROP COLUMN IF EXISTS phone_consent_at;
