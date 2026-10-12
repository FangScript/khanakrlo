CREATE TABLE admin_event_audit (
  event_id uuid PRIMARY KEY,
  event_type text NOT NULL,
  producer text NOT NULL,
  aggregate_id uuid NOT NULL,
  occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_event_audit_occurred ON admin_event_audit(occurred_at DESC,event_id);
CREATE FUNCTION reject_admin_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'admin event audit is append-only'; END;
$$;
CREATE TRIGGER admin_audit_no_mutation BEFORE UPDATE OR DELETE ON admin_event_audit FOR EACH ROW EXECUTE FUNCTION reject_admin_audit_mutation();
CREATE TRIGGER admin_audit_no_truncate BEFORE TRUNCATE ON admin_event_audit FOR EACH STATEMENT EXECUTE FUNCTION reject_admin_audit_mutation();
CREATE TABLE admin_staff_mfa (
  user_id uuid PRIMARY KEY,
  secret_ciphertext bytea NOT NULL,
  secret_nonce bytea NOT NULL CHECK(octet_length(secret_nonce)=12),
  secret_tag bytea NOT NULL CHECK(octet_length(secret_tag)=16),
  active_at timestamptz,
  failed_attempts integer NOT NULL DEFAULT 0 CHECK(failed_attempts BETWEEN 0 AND 5),
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE admin_mfa_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL,
  action text NOT NULL CHECK(action IN ('enrolled','verified')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER admin_mfa_audit_no_mutation BEFORE UPDATE OR DELETE ON admin_mfa_audit FOR EACH ROW EXECUTE FUNCTION reject_admin_audit_mutation();
CREATE TRIGGER admin_mfa_audit_no_truncate BEFORE TRUNCATE ON admin_mfa_audit FOR EACH STATEMENT EXECUTE FUNCTION reject_admin_audit_mutation();
