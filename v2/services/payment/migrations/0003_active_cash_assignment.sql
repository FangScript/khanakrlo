ALTER TABLE cod_order_authorizations ADD COLUMN collected_at timestamptz;
UPDATE cod_order_authorizations a SET collected_at=l.created_at
FROM cod_cash_ledger l WHERE l.order_id=a.order_id AND l.entry_type='collected';
CREATE UNIQUE INDEX cod_one_uncollected_assignment_per_rider ON cod_order_authorizations (rider_id)
WHERE delivery_status IN ('assigned','delivered') AND collected_at IS NULL;
