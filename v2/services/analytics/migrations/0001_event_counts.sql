CREATE TABLE analytics_event_counts (
  event_day date NOT NULL,
  event_type text NOT NULL,
  producer text NOT NULL,
  event_count bigint NOT NULL DEFAULT 0 CHECK (event_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_day,event_type,producer)
);
CREATE INDEX analytics_event_counts_type_day_idx ON analytics_event_counts (event_type,event_day DESC);
