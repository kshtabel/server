// server/database/DBRealEstateImages.js
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

  // Tabelle realEstateImages erstellen
  const createRealEstateImagesTable = `
    CREATE TABLE IF NOT EXISTS realEstateImages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      realEstate_id INT NOT NULL,
      image_path VARCHAR(255) NOT NULL,
      FOREIGN KEY (realEstate_id) REFERENCES realEstate(id) ON DELETE CASCADE
    );
  `;

  connection.query(createRealEstateImagesTable, (err, results) => {
    if (err) {
      console.error('Fehler beim Erstellen der Tabelle realEstateImages:', err);
    } else {
      console.log('Tabelle realEstateImages erfolgreich erstellt oder existiert bereits.');
    }
  });

  // Verbindung beenden
  connection.end();
});
