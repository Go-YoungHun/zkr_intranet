ALTER TABLE customers
  DROP INDEX uq_customers_name,
  ADD UNIQUE KEY uq_customers_parent_site_name (parent_id, site_name);
sudo rsync -av --delete dist/ /var/www/zkr-intranet/dist/
