-- Service database owners retain access; other service logins cannot connect.
DO $$
BEGIN
  EXECUTE format('REVOKE CONNECT, TEMPORARY ON DATABASE %I FROM PUBLIC', current_database());
END;
$$;
