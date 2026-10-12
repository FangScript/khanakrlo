CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE,
  customer_id uuid NOT NULL,
  outlet_id uuid NOT NULL,
  rating smallint NOT NULL CHECK(rating BETWEEN 1 AND 5),
  body text NOT NULL DEFAULT '' CHECK(char_length(body)<=2000),
  photo_object_key text CHECK(photo_object_key IS NULL OR char_length(photo_object_key)<=512),
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','published','hidden')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reviews_public_by_outlet ON reviews(outlet_id,created_at DESC) WHERE status='published';
CREATE TABLE review_moderation_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  review_id uuid NOT NULL REFERENCES reviews(id),
  actor_id uuid NOT NULL,
  action text NOT NULL CHECK(action IN ('published','hidden')),
  created_at timestamptz NOT NULL DEFAULT now()
);
