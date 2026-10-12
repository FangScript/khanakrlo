export default function AdminLandingPage() {
  return <main>
    <section className="desktopOnly">
      <p className="eyebrow">Khana KarLo · Operations</p>
      <h1>Operations console</h1>
      <p>The staff API is restricted to the configured host and IP allowlist and requires a staff role plus TOTP verification.</p>
      <p className="notice">The operations console interface and staff sign-in flow are not ready. Do not use this page for pilot operations.</p>
    </section>
    <section className="mobileBlocked" aria-live="polite">
      <h1>Use a desktop browser</h1>
      <p>The operations console is available on desktop only.</p>
    </section>
  </main>;
}
