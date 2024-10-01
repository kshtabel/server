// server/database/DBRealEstate.js
const mysql = require('mysql2');
require('dotenv').config({path: '../.env'});

// Erstelle eine Verbindung zur MySQL-Datenbank
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

// Verbindung herstellen
connection.connect((err) => {
  if (err) {
    console.error('Fehler bei der Verbindung zur Datenbank:', err);
    return;
  }
  console.log('Erfolgreich mit der MySQL-Datenbank verbunden.');

  // Tabelle realEstate erstellen
  const createRealEstateTable = `
    CREATE TABLE IF NOT EXISTS realEstate (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      detailedDescription TEXT NOT NULL,
      price DECIMAL(10, 8) NOT NULL
    );
  `;

  connection.query(createRealEstateTable, (err, results) => {
    if (err) {
      console.error('Fehler beim Erstellen der Tabelle realEstate:', err);
    } else {
      console.log('Tabelle realEstate erfolgreich erstellt oder existiert bereits.');
    }
  });

  // Verbindung beenden
  connection.end();
});
