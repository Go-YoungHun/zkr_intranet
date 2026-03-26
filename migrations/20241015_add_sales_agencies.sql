CREATE TABLE sales_agencies (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sales_agencies_name (name)
) ENGINE=InnoDB;

-- 기존 customers.sales_agent 문자열은 레거시 컬럼으로 유지하고,
-- sales_agency_id는 수동 매핑/운영 입력으로 관리합니다.
ALTER TABLE customers
  ADD COLUMN sales_agency_id BIGINT UNSIGNED NULL AFTER sales_agent,
  ADD KEY idx_customers_sales_agency_id (sales_agency_id),
  ADD CONSTRAINT fk_customers_sales_agency
    FOREIGN KEY (sales_agency_id)
    REFERENCES sales_agencies (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
