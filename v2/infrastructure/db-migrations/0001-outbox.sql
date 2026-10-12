CREATE TABLE IF NOT EXISTS outbox_events (
  event_id uuid PRIMARY KEY,
  event_type text NOT NULL,
  event_version integer NOT NULL CHECK (event_version > 0),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  correlation_id uuid,
  producer text NOT NULL,
  aggregate_id uuid NOT NULL,
  payload jsonb NOT NULL,
  published_at timestamptz,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz,
  last_error text
);
CREATE INDEX IF NOT EXISTS outbox_events_pending_idx
  ON outbox_events (occurred_at) WHERE published_at IS NULL;
CREATE TABLE IF NOT EXISTS processed_events (
  consumer_name text NOT NULL,
  event_id uuid NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (consumer_name, event_id)
);
