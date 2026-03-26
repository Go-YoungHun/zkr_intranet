ALTER TABLE ticket_attachments
  ADD COLUMN attachment_type VARCHAR(20) NOT NULL DEFAULT 'etc' AFTER label;
