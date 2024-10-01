const mysql = require('mysql2');
require('dotenv').config({path: '../server/.env'})

// Create a connection to the database
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: process.env.DB_PASS, // Replace with your MySQL root password
  database: process.env.DB_NAME
});

// Verbindung herstellen
db.connect((err) => {
  if (err) {
    console.error('Fehler bei der Datenbankverbindung:', err);
    return;
  }
  console.log('Mit der Datenbank verbunden.');

  // SQL-Abfrage zum Erstellen der Tabelle "transactions"
  const createTransactionsTable = `
    CREATE TABLE IF NOT EXISTS transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      wallet_id INT,
      transaction_type ENUM('deposit', 'withdrawal', 'transfer') NOT NULL,
      amount DECIMAL(16, 8) NOT NULL,
      transaction_fee DECIMAL(16, 8),
      recipient_address VARCHAR(255),
      transaction_status ENUM('pending', 'completed', 'failed') NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      tx_id VARCHAR(255),
      FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
      FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
    );
  `;

  // Führe die Abfrage aus, um die Tabelle zu erstellen
  db.query(createTransactionsTable, (err, result) => {
    if (err) {
      console.error('Fehler beim Erstellen der Tabelle "transactions":', err);
      return;
    }
    console.log('Tabelle "transactions" erfolgreich erstellt oder bereits vorhanden.');
  });

  // Verbindung beenden
  db.end();
});