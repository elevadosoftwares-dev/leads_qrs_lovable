-- QRS (Quotation Retrieval System) - SQL Server schema.
-- Applied automatically when the app first connects (src/server/db.server.ts), after creating
-- the database if needed. Safe to re-run: every object is created only if it does not exist.
-- Separate batches with a line containing only GO. To apply by hand:
--   sqlcmd -S <server> -U <user> -P <password> -d leads_qrs -i database/schema.sql

SET NOCOUNT ON;

-- Login accounts. Admins can add/edit/delete; Users are view only.
IF OBJECT_ID(N'dbo.users', N'U') IS NULL
CREATE TABLE dbo.users (
  id            UNIQUEIDENTIFIER NOT NULL CONSTRAINT pk_users PRIMARY KEY DEFAULT NEWID(),
  username      NVARCHAR(100)    NOT NULL CONSTRAINT uq_users_username UNIQUE,
  full_name     NVARCHAR(200)    NOT NULL,
  password_hash NVARCHAR(256)    NOT NULL,
  role          NVARCHAR(10)     NOT NULL CONSTRAINT df_users_role DEFAULT N'User'
    CONSTRAINT ck_users_role CHECK (role IN (N'Admin', N'User')),
  created_at    DATETIME2(3)     NOT NULL CONSTRAINT df_users_created_at DEFAULT SYSUTCDATETIME()
);

-- Login sessions. token_hash is the SHA-256 of the random token kept in the browser cookie.
IF OBJECT_ID(N'dbo.sessions', N'U') IS NULL
CREATE TABLE dbo.sessions (
  token_hash CHAR(64)         NOT NULL CONSTRAINT pk_sessions PRIMARY KEY,
  user_id    UNIQUEIDENTIFIER NOT NULL
    CONSTRAINT fk_sessions_user REFERENCES dbo.users(id) ON DELETE CASCADE,
  expires_at DATETIME2(3)     NOT NULL,
  created_at DATETIME2(3)     NOT NULL CONSTRAINT df_sessions_created_at DEFAULT SYSUTCDATETIME()
);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_sessions_user_id')
  CREATE INDEX ix_sessions_user_id ON dbo.sessions(user_id);

-- Lead group of companies.
IF OBJECT_ID(N'dbo.companies', N'U') IS NULL
CREATE TABLE dbo.companies (
  id         UNIQUEIDENTIFIER NOT NULL CONSTRAINT pk_companies PRIMARY KEY DEFAULT NEWID(),
  name       NVARCHAR(200)    NOT NULL,
  code       NVARCHAR(20)     NOT NULL,
  created_at DATETIME2(3)     NOT NULL CONSTRAINT df_companies_created_at DEFAULT SYSUTCDATETIME()
);

IF OBJECT_ID(N'dbo.clients', N'U') IS NULL
CREATE TABLE dbo.clients (
  id         UNIQUEIDENTIFIER NOT NULL CONSTRAINT pk_clients PRIMARY KEY DEFAULT NEWID(),
  name       NVARCHAR(300)    NOT NULL,
  created_at DATETIME2(3)     NOT NULL CONSTRAINT df_clients_created_at DEFAULT SYSUTCDATETIME()
);

-- A client has many projects, each with its own point of contact.
IF OBJECT_ID(N'dbo.projects', N'U') IS NULL
CREATE TABLE dbo.projects (
  id         UNIQUEIDENTIFIER NOT NULL CONSTRAINT pk_projects PRIMARY KEY DEFAULT NEWID(),
  client_id  UNIQUEIDENTIFIER NOT NULL
    CONSTRAINT fk_projects_client REFERENCES dbo.clients(id) ON DELETE CASCADE,
  name       NVARCHAR(300)    NOT NULL,
  poc_name   NVARCHAR(200)    NOT NULL CONSTRAINT df_projects_poc_name DEFAULT N'',
  poc_phone  NVARCHAR(50)     NOT NULL CONSTRAINT df_projects_poc_phone DEFAULT N'',
  created_at DATETIME2(3)     NOT NULL CONSTRAINT df_projects_created_at DEFAULT SYSUTCDATETIME()
);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_projects_client_id')
  CREATE INDEX ix_projects_client_id ON dbo.projects(client_id);

-- Leads BDMs: the "Prepared For" person on a quotation.
IF OBJECT_ID(N'dbo.bdms', N'U') IS NULL
CREATE TABLE dbo.bdms (
  id         UNIQUEIDENTIFIER NOT NULL CONSTRAINT pk_bdms PRIMARY KEY DEFAULT NEWID(),
  name       NVARCHAR(200)    NOT NULL,
  email      NVARCHAR(320)    NOT NULL CONSTRAINT df_bdms_email DEFAULT N'',
  created_at DATETIME2(3)     NOT NULL CONSTRAINT df_bdms_created_at DEFAULT SYSUTCDATETIME()
);

-- Staff who prepare/add quotations. They do not need login accounts; quotations keep the
-- name as text so historical names survive renames and deletions.
IF OBJECT_ID(N'dbo.preparers', N'U') IS NULL
CREATE TABLE dbo.preparers (
  id         UNIQUEIDENTIFIER NOT NULL CONSTRAINT pk_preparers PRIMARY KEY DEFAULT NEWID(),
  name       NVARCHAR(200)    NOT NULL,
  created_at DATETIME2(3)     NOT NULL CONSTRAINT df_preparers_created_at DEFAULT SYSUTCDATETIME()
);

-- Quotation numbers are entered by hand and unique per company (case-insensitive collation).
IF OBJECT_ID(N'dbo.quotations', N'U') IS NULL
CREATE TABLE dbo.quotations (
  id               UNIQUEIDENTIFIER NOT NULL CONSTRAINT pk_quotations PRIMARY KEY DEFAULT NEWID(),
  number           NVARCHAR(100)    NOT NULL,
  company_id       UNIQUEIDENTIFIER NOT NULL
    CONSTRAINT fk_quotations_company REFERENCES dbo.companies(id),
  client_id        UNIQUEIDENTIFIER NOT NULL
    CONSTRAINT fk_quotations_client REFERENCES dbo.clients(id),
  project_id       UNIQUEIDENTIFIER NOT NULL
    CONSTRAINT fk_quotations_project REFERENCES dbo.projects(id),
  site_reference   NVARCHAR(300)    NOT NULL,
  prepared_for_id  UNIQUEIDENTIFIER NOT NULL
    CONSTRAINT fk_quotations_prepared_for REFERENCES dbo.bdms(id),
  prepared_by      NVARCHAR(200)    NOT NULL,
  note1            NVARCHAR(60)     NOT NULL,
  note2            NVARCHAR(MAX)    NOT NULL CONSTRAINT df_quotations_note2 DEFAULT N'',
  status           NVARCHAR(20)     NOT NULL CONSTRAINT df_quotations_status DEFAULT N'Pending'
    CONSTRAINT ck_quotations_status CHECK (status IN (N'Pending', N'Successful', N'Failed')),
  fail_reason      NVARCHAR(500)    NOT NULL CONSTRAINT df_quotations_fail_reason DEFAULT N'',
  created_at       DATETIME2(3)     NOT NULL CONSTRAINT df_quotations_created_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT uq_quotations_company_number UNIQUE (company_id, number)
);

-- PDF documents, stored in the database.
IF OBJECT_ID(N'dbo.attachments', N'U') IS NULL
CREATE TABLE dbo.attachments (
  id            UNIQUEIDENTIFIER NOT NULL CONSTRAINT pk_attachments PRIMARY KEY DEFAULT NEWID(),
  quotation_id  UNIQUEIDENTIFIER NOT NULL
    CONSTRAINT fk_attachments_quotation REFERENCES dbo.quotations(id) ON DELETE CASCADE,
  file_name     NVARCHAR(260)    NOT NULL,
  category      NVARCHAR(100)    NOT NULL,
  content_type  NVARCHAR(200)    NOT NULL,
  size_bytes    INT              NOT NULL,
  data          VARBINARY(MAX)   NOT NULL,
  uploaded_by   NVARCHAR(200)    NOT NULL,
  uploaded_at   DATETIME2(3)     NOT NULL CONSTRAINT df_attachments_uploaded_at DEFAULT SYSUTCDATETIME()
);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_attachments_quotation_id')
  CREATE INDEX ix_attachments_quotation_id ON dbo.attachments(quotation_id);

-- Who viewed, previewed or downloaded a quotation. user_name keeps the name at the time.
IF OBJECT_ID(N'dbo.access_logs', N'U') IS NULL
CREATE TABLE dbo.access_logs (
  id           BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT pk_access_logs PRIMARY KEY,
  quotation_id UNIQUEIDENTIFIER NOT NULL
    CONSTRAINT fk_access_logs_quotation REFERENCES dbo.quotations(id) ON DELETE CASCADE,
  user_id      UNIQUEIDENTIFIER NULL
    CONSTRAINT fk_access_logs_user REFERENCES dbo.users(id) ON DELETE SET NULL,
  user_name    NVARCHAR(200)    NOT NULL,
  action       NVARCHAR(10)     NOT NULL
    CONSTRAINT ck_access_logs_action CHECK (action IN (N'View', N'Preview', N'Download')),
  at           DATETIME2(3)     NOT NULL CONSTRAINT df_access_logs_at DEFAULT SYSUTCDATETIME()
);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_access_logs_quotation_id')
  CREATE INDEX ix_access_logs_quotation_id ON dbo.access_logs(quotation_id, at DESC);

-- Recipients of quotation-access alert emails.
IF OBJECT_ID(N'dbo.mail_settings', N'U') IS NULL
CREATE TABLE dbo.mail_settings (
  id         UNIQUEIDENTIFIER NOT NULL CONSTRAINT pk_mail_settings PRIMARY KEY DEFAULT NEWID(),
  from_email NVARCHAR(320)    NOT NULL,
  to_email   NVARCHAR(320)    NOT NULL,
  subject    NVARCHAR(300)    NOT NULL,
  threshold  INT              NOT NULL CONSTRAINT df_mail_settings_threshold DEFAULT 5,
  created_at DATETIME2(3)     NOT NULL CONSTRAINT df_mail_settings_created_at DEFAULT SYSUTCDATETIME()
);
