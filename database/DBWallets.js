const mysql = require('mysql2');
const crypto = require('crypto');

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

  // Überprüfe, ob die Spalte wallet_balance existiert
  const checkColumnExists = `
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'wallets' 
    AND COLUMN_NAME = 'wallet_balance';
  `;

  db.query(checkColumnExists, (err, results) => {
    if (err) throw err;

    if (results.length === 0) {
      // Spalte hinzufügen, wenn sie nicht existiert
      const addWalletBalanceColumn = `
        ALTER TABLE wallets 
        ADD COLUMN wallet_balance DECIMAL(16, 8) DEFAULT 0.00000000;
      `;

      db.query(addWalletBalanceColumn, (err) => {
        if (err) throw err;
        console.log('Spalte wallet_balance erfolgreich hinzugefügt.');
        initializeWallets();
      });
    } else {
      console.log('Spalte wallet_balance existiert bereits.');
      initializeWallets();
    }
  });
});

// Funktion zur Initialisierung von Wallets für Benutzer ohne Wallet
function initializeWallets() {
  // Funktion zur Generierung einer Beispiel-BTC-Wallet-Adresse
  const generateBTCAddress = () => {
    return '1' + crypto.randomBytes(20).toString('hex');
  };

  // Hole alle Benutzer aus der user-Tabelle, die noch keine Wallet-Adresse haben
  const getUsersWithoutWallet = `
    SELECT id FROM user WHERE wallet_id IS NULL;
  `;

  db.query(getUsersWithoutWallet, (err, users) => {
    if (err) throw err;

    users.forEach(user => {
      // Generiere eine BTC-Wallet-Adresse für jeden Benutzer
      const walletAddress = generateBTCAddress();

      // Füge die generierte Wallet-Adresse in die Tabelle wallets ein
      const insertWallet = `
        INSERT INTO wallets (wallet_address, wallet_balance) VALUES (?, ?);
      `;

      db.query(insertWallet, [walletAddress, 0.00000000], (err, result) => {
        if (err) throw err;

        const walletId = result.insertId;

        // Aktualisiere die user-Tabelle mit dem wallet_id
        const updateUser = `
          UPDATE user SET wallet_id = ? WHERE id = ?;
        `;

        db.query(updateUser, [walletId, user.id], (err, result) => {
          if (err) throw err;
          console.log(`Wallet für Benutzer ID ${user.id} erfolgreich erstellt und verknüpft.`);
        });
      });
    });
  });
}

module.exports = db;