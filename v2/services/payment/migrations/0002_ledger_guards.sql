-- Existing duplicate collections must be reconciled before this migration can succeed.
CREATE UNIQUE INDEX cod_one_collection_per_order ON cod_cash_ledger (order_id) WHERE entry_type = 'collected';
CREATE UNIQUE INDEX cod_one_verification_per_remittance ON cod_cash_ledger (remittance_id) WHERE entry_type = 'remittance_verified';

CREATE FUNCTION reject_immutable_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Ledger and audit records are append-only' USING ERRCODE = '55000';
END;
$$;
CREATE TRIGGER cod_ledger_append_only BEFORE UPDATE OR DELETE ON cod_cash_ledger FOR EACH ROW EXECUTE FUNCTION reject_immutable_mutation();
CREATE TRIGGER cod_ledger_no_truncate BEFORE TRUNCATE ON cod_cash_ledger FOR EACH STATEMENT EXECUTE FUNCTION reject_immutable_mutation();
CREATE TRIGGER payment_audit_append_only BEFORE UPDATE OR DELETE ON payment_audit_log FOR EACH ROW EXECUTE FUNCTION reject_immutable_mutation();
CREATE TRIGGER payment_audit_no_truncate BEFORE TRUNCATE ON payment_audit_log FOR EACH STATEMENT EXECUTE FUNCTION reject_immutable_mutation();
CREATE VIEW cod_custody_reconciliation AS
SELECT c.rider_id, c.outstanding_paisa,
  COALESCE(sum(CASE l.entry_type WHEN 'collected' THEN l.amount_paisa ELSE -l.amount_paisa END),0)::bigint AS ledger_paisa,
  c.outstanding_paisa - COALESCE(sum(CASE l.entry_type WHEN 'collected' THEN l.amount_paisa ELSE -l.amount_paisa END),0)::bigint AS variance_paisa
FROM rider_cash_custody c LEFT JOIN cod_cash_ledger l ON l.rider_id=c.rider_id
GROUP BY c.rider_id, c.outstanding_paisa;
