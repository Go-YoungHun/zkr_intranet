ALTER TABLE customers
  DROP FOREIGN KEY fk_customers_parent,
  DROP INDEX uq_customers_parent_site_name,
  DROP INDEX idx_customers_parent,
  DROP COLUMN parent_id;
