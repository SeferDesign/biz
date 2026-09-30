import { getPool } from './pool.js';

const statements = [
  `CREATE TABLE IF NOT EXISTS users (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL DEFAULT '',
    encrypted_password VARCHAR(255) NOT NULL DEFAULT '',
    reset_password_token VARCHAR(255),
    reset_password_sent_at DATETIME,
    remember_created_at DATETIME,
    sign_in_count INT NOT NULL DEFAULT 0,
    current_sign_in_at DATETIME,
    last_sign_in_at DATETIME,
    current_sign_in_ip VARCHAR(255),
    last_sign_in_ip VARCHAR(255),
    created_at DATETIME,
    updated_at DATETIME,
    encrypted_otp_secret VARCHAR(255),
    encrypted_otp_secret_iv VARCHAR(255),
    encrypted_otp_secret_salt VARCHAR(255),
    consumed_timestep INT,
    otp_required_for_login BOOLEAN,
    google_token VARCHAR(255),
    UNIQUE INDEX users_email_unique (email),
    UNIQUE INDEX users_reset_password_token_unique (reset_password_token)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS clients (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255), contact VARCHAR(255), site_url VARCHAR(255), logo VARCHAR(255),
    address1 VARCHAR(255), address2 VARCHAR(255), zipcode VARCHAR(32), city VARCHAR(255),
    state VARCHAR(255), international BOOLEAN, intinfo VARCHAR(255),
    email_accounting VARCHAR(255), email_accounting_2 VARCHAR(255), email_accounting_3 VARCHAR(255),
    preferred_paymenttype VARCHAR(255), currentrate INT, federalein VARCHAR(255),
    gsheet_id VARCHAR(255), stripe_customer_id VARCHAR(255), access_token VARCHAR(255),
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS years (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    year SMALLINT UNSIGNED NOT NULL UNIQUE,
    taxrate DECIMAL(8, 4) NOT NULL DEFAULT 0,
    goal_year DECIMAL(12, 2) NOT NULL DEFAULT 0,
    goals_months JSON NOT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS vendors (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255), category VARCHAR(255), notes TEXT,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS invoices (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    client_id BIGINT UNSIGNED,
    date DATE,
    cost DECIMAL(12, 2),
    paid BOOLEAN NOT NULL DEFAULT FALSE,
    paiddate DATE,
    paymenttype VARCHAR(255),
    description TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    currency VARCHAR(8) NOT NULL DEFAULT 'USD',
    stripe_session_id VARCHAR(255),
    access_token VARCHAR(255) UNIQUE,
    stripe_card_session_id VARCHAR(255),
    stripe_bank_session_id VARCHAR(255),
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT invoices_client_fk FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
    INDEX invoices_date_idx (date),
    INDEX invoices_paiddate_idx (paiddate)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS \`lines\` (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    description VARCHAR(255), hourly BOOLEAN,
    hours DECIMAL(10, 2), rate DECIMAL(12, 2), total DECIMAL(12, 2),
    invoice_id BIGINT UNSIGNED NOT NULL,
    discount BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT lines_invoice_fk FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    INDEX lines_invoice_idx (invoice_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS invoice_email_sends (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    invoice_id BIGINT UNSIGNED NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT invoice_email_sends_invoice_fk FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    INDEX invoice_email_sends_invoice_idx (invoice_id, sent_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS expenses (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255), vendor_id BIGINT UNSIGNED,
    date DATE, cost DECIMAL(12, 2), notes TEXT, account VARCHAR(255),
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT expenses_vendor_fk FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL,
    INDEX expenses_date_idx (date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS seed_runs (
    seed_name VARCHAR(100) NOT NULL PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
];

export async function initializeSchema(database = getPool()) {
  for (const statement of statements) {
    await database.query(statement);
  }
}
