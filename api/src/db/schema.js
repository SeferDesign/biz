import { getPool } from './pool.js';

const statements = [
  `CREATE TABLE IF NOT EXISTS users (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL DEFAULT '',
    encrypted_password VARCHAR(255) NOT NULL DEFAULT '',
    first_name VARCHAR(255) NOT NULL DEFAULT '',
    last_name VARCHAR(255) NOT NULL DEFAULT '',
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
  `CREATE TABLE IF NOT EXISTS user_sessions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    user_agent VARCHAR(512) NOT NULL DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME NULL,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME NULL,
    CONSTRAINT user_sessions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE INDEX user_sessions_token_hash_unique (token_hash),
    INDEX user_sessions_user_active_idx (user_id, revoked_at, expires_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS api_keys (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    label VARCHAR(255) NOT NULL,
    key_value VARCHAR(255) NOT NULL,
    last_used_at DATETIME NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT api_keys_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE INDEX api_keys_key_value_unique (key_value),
    INDEX api_keys_user_idx (user_id, id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS passkeys (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    credential_id TEXT NOT NULL,
    credential_id_hash BINARY(32) NOT NULL,
    public_key BLOB NOT NULL,
    counter BIGINT UNSIGNED NOT NULL DEFAULT 0,
    transports JSON NULL,
    name VARCHAR(255) NOT NULL DEFAULT 'Passkey',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT passkeys_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE INDEX passkeys_credential_hash_unique (credential_id_hash),
    INDEX passkeys_user_idx (user_id, id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS webauthn_challenges (
    challenge_id CHAR(43) NOT NULL PRIMARY KEY,
    challenge VARCHAR(255) NOT NULL,
    purpose VARCHAR(32) NOT NULL,
    user_id INT NULL,
    expires_at DATETIME NOT NULL,
    INDEX webauthn_challenge_expiry_idx (expires_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS clients (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255), contact VARCHAR(255), site_url VARCHAR(255), logo VARCHAR(255),
    address1 VARCHAR(255), address2 VARCHAR(255), zipcode VARCHAR(32), city VARCHAR(255),
    state VARCHAR(255), international BOOLEAN, intinfo VARCHAR(255),
    email_accounting VARCHAR(255), email_accounting_2 VARCHAR(255), email_accounting_3 VARCHAR(255),
    preferred_paymenttype VARCHAR(255), currentrate INT, federalein VARCHAR(255),
    payment_terms VARCHAR(16) NOT NULL DEFAULT 'Net 15',
    gsheet_id VARCHAR(255), stripe_customer_id VARCHAR(255), access_token VARCHAR(255),
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS invoice_templates (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    client_id BIGINT UNSIGNED NULL,
    name VARCHAR(120) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT invoice_templates_client_fk FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    INDEX invoice_templates_client_idx (client_id, name)
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
  `CREATE TABLE IF NOT EXISTS recurring_expense_rules (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    vendor_id BIGINT UNSIGNED NULL,
    date DATE NOT NULL,
    cost DECIMAL(12, 2) NOT NULL,
    notes TEXT,
    account VARCHAR(255) NOT NULL DEFAULT 'Business',
    interval_unit VARCHAR(16) NOT NULL,
    interval_count SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    next_date DATE NULL,
    next_index INT UNSIGNED NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT recurring_expenses_vendor_fk FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL,
    INDEX recurring_expenses_due_idx (active, next_date)
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
  `CREATE TABLE IF NOT EXISTS invoice_payments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    invoice_id BIGINT UNSIGNED NOT NULL,
    stripe_checkout_session_id VARCHAR(255) NOT NULL,
    stripe_payment_intent_id VARCHAR(255),
    method VARCHAR(32),
    amount DECIMAL(12, 2),
    currency VARCHAR(8) NOT NULL DEFAULT 'USD',
    status VARCHAR(32) NOT NULL,
    failure_message VARCHAR(500),
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE INDEX invoice_payments_session_unique (stripe_checkout_session_id),
    CONSTRAINT invoice_payments_invoice_fk FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    INDEX invoice_payments_invoice_idx (invoice_id, submitted_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS change_history (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    entity_type VARCHAR(32) NOT NULL,
    entity_id BIGINT UNSIGNED NOT NULL,
    action VARCHAR(32) NOT NULL,
    actor_user_id INT NULL,
    actor_email VARCHAR(255) NULL,
    source VARCHAR(32) NOT NULL,
    changes JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX change_history_entity_idx (entity_type, entity_id, created_at, id),
    INDEX change_history_created_idx (created_at, id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS expenses (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255), vendor_id BIGINT UNSIGNED,
    date DATE, cost DECIMAL(12, 2), notes TEXT, account VARCHAR(255),
    is_planned BOOLEAN NOT NULL DEFAULT FALSE,
    recurring_rule_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT expenses_vendor_fk FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL,
    CONSTRAINT expenses_recurring_rule_fk FOREIGN KEY (recurring_rule_id) REFERENCES recurring_expense_rules(id) ON DELETE SET NULL,
    INDEX expenses_date_idx (date),
    INDEX expenses_actual_date_idx (is_planned, date),
    UNIQUE INDEX expenses_recurring_date_unique (recurring_rule_id, date)
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
  const [userFirstNameColumns] = await database.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'first_name'`
  );
  if (!userFirstNameColumns.length) {
    await database.query("ALTER TABLE users ADD COLUMN first_name VARCHAR(255) NOT NULL DEFAULT '' AFTER encrypted_password");
  }
  const [userLastNameColumns] = await database.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'last_name'`
  );
  if (!userLastNameColumns.length) {
    await database.query("ALTER TABLE users ADD COLUMN last_name VARCHAR(255) NOT NULL DEFAULT '' AFTER first_name");
  }
  const [columns] = await database.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clients' AND COLUMN_NAME = 'payment_terms'`
  );
  if (!columns.length) {
    await database.query("ALTER TABLE clients ADD COLUMN payment_terms VARCHAR(16) NOT NULL DEFAULT 'Net 15'");
  }
  const [expenseColumns] = await database.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'expenses'`
  );
  const expenseColumnNames = new Set(expenseColumns.map((column) => column.COLUMN_NAME));
  if (!expenseColumnNames.has('is_planned')) {
    await database.query('ALTER TABLE expenses ADD COLUMN is_planned BOOLEAN NOT NULL DEFAULT FALSE AFTER account');
  }
  if (!expenseColumnNames.has('recurring_rule_id')) {
    await database.query('ALTER TABLE expenses ADD COLUMN recurring_rule_id BIGINT UNSIGNED NULL AFTER is_planned');
  }
  const [expenseIndexes] = await database.query(
    `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'expenses'`
  );
  const expenseIndexNames = new Set(expenseIndexes.map((index) => index.INDEX_NAME));
  if (!expenseIndexNames.has('expenses_recurring_date_unique')) {
    await database.query('ALTER TABLE expenses ADD UNIQUE INDEX expenses_recurring_date_unique (recurring_rule_id, date)');
  }
  if (!expenseIndexNames.has('expenses_actual_date_idx')) {
    await database.query('ALTER TABLE expenses ADD INDEX expenses_actual_date_idx (is_planned, date)');
  }
  const [expenseForeignKeys] = await database.query(
    `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'expenses' AND CONSTRAINT_NAME = 'expenses_recurring_rule_fk'`
  );
  if (!expenseForeignKeys.length) {
    await database.query(`ALTER TABLE expenses ADD CONSTRAINT expenses_recurring_rule_fk
      FOREIGN KEY (recurring_rule_id) REFERENCES recurring_expense_rules(id) ON DELETE SET NULL`);
  }
  const [recurringRuleColumns] = await database.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recurring_expense_rules'`
  );
  if (!recurringRuleColumns.some((column) => column.COLUMN_NAME === 'next_index')) {
    await database.query('ALTER TABLE recurring_expense_rules ADD COLUMN next_index INT UNSIGNED NOT NULL DEFAULT 0 AFTER next_date');
  }
}
