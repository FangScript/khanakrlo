CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  outlet_id uuid NOT NULL,
  address_id uuid NOT NULL,
  address_snapshot jsonb NOT NULL,
  payment_method text NOT NULL CHECK (payment_method = 'cod'),
  status text NOT NULL CHECK (status IN ('placed','accepted','rejected','preparing','ready','assigned','picked_up','delivered','cancelled')),
  items_snapshot jsonb NOT NULL,
  subtotal_paisa bigint NOT NULL CHECK (subtotal_paisa > 0),
  delivery_fee_paisa bigint NOT NULL CHECK (delivery_fee_paisa >= 0),
  service_fee_paisa bigint NOT NULL CHECK (service_fee_paisa >= 0),
  commission_rate_bps integer NOT NULL CHECK (commission_rate_bps BETWEEN 0 AND 10000),
  commission_paisa bigint NOT NULL CHECK (commission_paisa >= 0),
  total_paisa bigint NOT NULL CHECK (total_paisa > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_customer_created_idx ON orders(customer_id,created_at DESC);
CREATE INDEX orders_outlet_status_created_idx ON orders(outlet_id,status,created_at) WHERE status IN ('placed','accepted','preparing','ready');

CREATE TABLE order_status_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES orders(id),
  actor_id uuid NOT NULL,
  from_status text,
  to_status text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_status_history_order_idx ON order_status_history(order_id,occurred_at);
