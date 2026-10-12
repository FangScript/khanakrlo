CREATE TABLE merchant_commission_policies (
  outlet_id uuid PRIMARY KEY,
  rate_bps integer NOT NULL CHECK (rate_bps BETWEEN 0 AND 10000),
  updated_by uuid NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
