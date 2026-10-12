CREATE TABLE identity_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_subject text NOT NULL UNIQUE,
  email text,
  display_name text,
  phone_ciphertext bytea,
  phone_nonce bytea,
  phone_last_four char(4),
  phone_consent_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE identity_user_roles (
  user_id uuid NOT NULL REFERENCES identity_users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('customer', 'merchant', 'rider', 'staff')),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);
CREATE TABLE identity_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES identity_users(id) ON DELETE CASCADE,
  refresh_token_hash char(64) NOT NULL,
  refresh_expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE INDEX identity_sessions_user_active_idx ON identity_sessions (user_id) WHERE revoked_at IS NULL;
