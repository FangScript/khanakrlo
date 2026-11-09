CREATE TABLE IF NOT EXISTS identity.accounts (
  id uuid PRIMARY KEY, email text UNIQUE NOT NULL, salt text NOT NULL, digest text NOT NULL,
  email_verified boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS identity.sessions (
  token_hash text PRIMARY KEY, account_id uuid NOT NULL REFERENCES identity.accounts(id) ON DELETE CASCADE
);
GRANT SELECT, INSERT ON identity.accounts TO identity_runtime;
GRANT SELECT, INSERT, DELETE ON identity.sessions TO identity_runtime;
