CREATE TABLE request_idempotency (
  actor_id uuid NOT NULL,
  scope text NOT NULL,
  key text NOT NULL,
  request_hash char(64) NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (actor_id, scope, key)
);
