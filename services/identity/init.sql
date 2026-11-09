\getenv runtime_password IDENTITY_PASSWORD
CREATE ROLE identity_runtime LOGIN PASSWORD :'runtime_password';
CREATE SCHEMA identity;
CREATE TABLE identity.schema_version (version integer PRIMARY KEY);
INSERT INTO identity.schema_version VALUES (1);
GRANT USAGE ON SCHEMA identity TO identity_runtime;
GRANT SELECT ON identity.schema_version TO identity_runtime;
