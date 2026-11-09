CREATE TABLE IF NOT EXISTS identity.challenges (
  account_id uuid NOT NULL REFERENCES identity.accounts(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('verify','reset')),
  digest text,
  expires_at timestamptz NOT NULL,
  remaining_attempts smallint NOT NULL DEFAULT 5,
  sent_since timestamptz NOT NULL DEFAULT now(),
  sent_count integer NOT NULL DEFAULT 1,
  PRIMARY KEY (account_id, purpose)
);
CREATE UNIQUE INDEX IF NOT EXISTS reset_token_lookup
  ON identity.challenges(digest) WHERE purpose = 'reset' AND digest IS NOT NULL;
GRANT SELECT, INSERT, UPDATE ON identity.challenges TO identity_runtime;
GRANT UPDATE (salt, digest, email_verified), DELETE ON identity.accounts TO identity_runtime;

CREATE TABLE IF NOT EXISTS identity.workspace_grants (
  account_id uuid NOT NULL REFERENCES identity.accounts(id) ON DELETE CASCADE,
  role text NOT NULL CHECK(role IN ('restaurant','rider')),
  label text NOT NULL,
  PRIMARY KEY(account_id, role)
);
-- Only the approval workflow or database administrator can issue a grant.
GRANT SELECT ON identity.workspace_grants TO identity_runtime;
