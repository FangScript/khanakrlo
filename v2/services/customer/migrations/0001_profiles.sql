CREATE TABLE customer_profiles (
  user_id uuid PRIMARY KEY,
  display_name text NOT NULL DEFAULT '',
  phone_ciphertext bytea,
  phone_nonce bytea,
  phone_last_four char(4),
  phone_consent_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text NOT NULL,
  address_line text NOT NULL,
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customer_addresses_owner ON customer_addresses (user_id, created_at, id);
CREATE TABLE customer_carts (
  user_id uuid PRIMARY KEY,
  outlet_id uuid NOT NULL,
  items jsonb NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
