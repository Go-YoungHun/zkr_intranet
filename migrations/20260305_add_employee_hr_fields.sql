ALTER TABLE employees
  ADD COLUMN department VARCHAR(100) NULL AFTER permission_level,
  ADD COLUMN job_title VARCHAR(100) NULL AFTER department,
  ADD COLUMN employment_status ENUM('ACTIVE', 'ON_LEAVE', 'RESIGNED') NOT NULL DEFAULT 'ACTIVE' AFTER job_title,
  ADD COLUMN contact_phone VARCHAR(50) NULL AFTER employment_status,
  ADD COLUMN contact_email VARCHAR(150) NULL AFTER contact_phone,
  ADD COLUMN address_line1 VARCHAR(255) NULL AFTER contact_email,
  ADD COLUMN address_line2 VARCHAR(255) NULL AFTER address_line1,
  ADD COLUMN note TEXT NULL AFTER address_line2;
