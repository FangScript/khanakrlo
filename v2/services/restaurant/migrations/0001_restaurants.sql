CREATE TABLE restaurant_organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  business_name text NOT NULL CHECK (length(business_name) BETWEEN 2 AND 120),
  cuisine text NOT NULL CHECK (length(cuisine) BETWEEN 2 AND 80),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, business_name)
);
CREATE INDEX restaurant_organisations_owner_idx ON restaurant_organisations (owner_user_id, created_at);

CREATE TABLE restaurant_outlets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES restaurant_organisations(id) ON DELETE CASCADE,
  outlet_name text NOT NULL CHECK (length(outlet_name) BETWEEN 2 AND 120),
  city text NOT NULL CHECK (length(city) BETWEEN 2 AND 80),
  address_line text NOT NULL CHECK (length(address_line) BETWEEN 5 AND 500),
  accepting_orders boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, outlet_name)
);
CREATE INDEX restaurant_outlets_organisation_idx ON restaurant_outlets (organisation_id, created_at);
