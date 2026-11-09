CREATE TABLE IF NOT EXISTS identity.staff_grants (
  account_id uuid PRIMARY KEY REFERENCES identity.accounts(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin','manager','reviewer','support','finance'))
);
CREATE TABLE IF NOT EXISTS identity.staff_changes (
  actor uuid NOT NULL, subject uuid NOT NULL, previous_role text, new_role text,
  changed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON identity.staff_grants TO identity_runtime;
GRANT INSERT ON identity.staff_changes TO identity_runtime;
