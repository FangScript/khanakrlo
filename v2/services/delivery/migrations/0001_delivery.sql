CREATE TABLE deliveries (
  order_id uuid PRIMARY KEY,
  customer_id uuid NOT NULL,
  outlet_id uuid NOT NULL,
  total_paisa bigint NOT NULL CHECK (total_paisa > 0),
  dropoff jsonb NOT NULL,
  status text NOT NULL CHECK (status IN ('awaiting_merchant','queued','assigning','assigned','picked_up','delivered','cancelled')),
  rider_id uuid,
  assigned_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX deliveries_dispatch_queue ON deliveries(created_at) WHERE status='queued';
CREATE UNIQUE INDEX deliveries_one_active_per_rider ON deliveries(rider_id) WHERE rider_id IS NOT NULL AND status IN ('assigning','assigned','picked_up');
CREATE TABLE rider_presence (
  rider_id uuid PRIMARY KEY,
  available boolean NOT NULL DEFAULT false,
  latitude double precision,
  longitude double precision,
  location_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180))
);
CREATE TABLE delivery_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id uuid NOT NULL,
  actor_id uuid,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
