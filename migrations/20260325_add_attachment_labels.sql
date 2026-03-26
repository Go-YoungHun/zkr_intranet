ALTER TABLE ticket_attachments
  ADD COLUMN label VARCHAR(255) NULL AFTER file_name;

ALTER TABLE machine_attachments
  ADD COLUMN label VARCHAR(255) NULL AFTER file_name;
