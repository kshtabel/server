const mysql = require('mysql2');

// Erstelle eine MySQL-Datenbankverbindung
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Wu:@z2![gwhQR3bf<#[.', // Ersetze dies mit deinem MySQL root Passwort
  database: 'nodebase'
});

db.connect((err) => {
  if (err) throw err;
  console.log('MySQL connected...');

  // Erstelle die Tabelle "wallets", falls sie noch nicht existiert
  const createWalletsTable = `
    CREATE TABLE IF NOT EXISTS wallets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      wallet_address VARCHAR(255) NOT NULL
    );
  `;

  db.query(createWalletsTable, (err, result) => {
    if (err) throw err;
    console.log('Table "wallets" created or already exists.');

    // Prüfe, ob die Spalte "wallet_id" bereits in der Tabelle "user" existiert
    const checkColumnExists = `
      SELECT COUNT(*) AS count FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = 'nodebase' AND TABLE_NAME = 'user' AND COLUMN_NAME = 'wallet_id';
    `;

    db.query(checkColumnExists, (err, result) => {
      if (err) throw err;

      if (result[0].count === 0) {
        // Füge die Spalte wallet_id zur user-Tabelle hinzu und erstelle den Fremdschlüssel
        const addWalletIdColumn = `
          ALTER TABLE user
          ADD COLUMN wallet_id INT,
          ADD CONSTRAINT FK_wallet FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE SET NULL;
        `;

        db.query(addWalletIdColumn, (err, result) => {
          if (err) throw err;
          console.log('Foreign key "wallet_id" added to "user" table.');
        });
      } else {
        console.log('Column "wallet_id" already exists in "user" table.');
      }
    });
  });
});

module.exports = db;
