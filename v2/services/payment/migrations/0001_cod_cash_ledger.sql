CREATE TABLE rider_cash_custody (
  rider_id uuid PRIMARY KEY,
  outstanding_paisa bigint NOT NULL DEFAULT 0 CHECK (outstanding_paisa >= 0),
  reserved_paisa bigint NOT NULL DEFAULT 0 CHECK (reserved_paisa >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cod_order_authorizations (
  order_id uuid PRIMARY KEY,
  rider_id uuid NOT NULL,
  amount_paisa bigint NOT NULL CHECK (amount_paisa > 0),
  delivery_status text NOT NULL CHECK (delivery_status IN ('assigned', 'delivered', 'cancelled')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cod_order_authorizations_rider_idx ON cod_order_authorizations (rider_id, delivery_status);

CREATE TABLE cod_remittances (
  id uuid PRIMARY KEY,
  rider_id uuid NOT NULL REFERENCES rider_cash_custody(rider_id),
  amount_paisa bigint NOT NULL CHECK (amount_paisa > 0),
  receipt_reference text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash char(64) NOT NULL,
  status text NOT NULL DEFAULT 'awaiting_verification' CHECK (status IN ('awaiting_verification', 'verified')),
  verified_by uuid,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rider_id, idempotency_key),
  CHECK ((status = 'verified') = (verified_by IS NOT NULL AND verified_at IS NOT NULL))
);

CREATE TABLE cod_cash_ledger (
  id uuid PRIMARY KEY,
  rider_id uuid NOT NULL REFERENCES rider_cash_custody(rider_id),
  order_id uuid,
  entry_type text NOT NULL CHECK (entry_type IN ('collected', 'remittance_verified')),
  amount_paisa bigint NOT NULL CHECK (amount_paisa > 0),
  remittance_id uuid REFERENCES cod_remittances(id),
  idempotency_key text NOT NULL,
  request_hash char(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((entry_type = 'collected' AND order_id IS NOT NULL AND remittance_id IS NULL) OR (entry_type = 'remittance_verified' AND order_id IS NULL AND remittance_id IS NOT NULL)),
  UNIQUE (rider_id, idempotency_key)
);
CREATE INDEX cod_cash_ledger_rider_created_idx ON cod_cash_ledger (rider_id, created_at DESC);

CREATE TABLE payment_audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid NOT NULL,
  action text NOT NULL,
  subject_id uuid NOT NULL,
  details jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
