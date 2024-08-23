const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');
const app = express();
const port = 3000;

const JWT_SECRET = 'd1a542245dbbb189cc189674ba0b1c86b8b9cc9ab5174256afa6803fdaad8aa0960621ea260a9930035a45e2bd49d45b650c5b7005dea3659f3ae6a4b8fd7a4cd927779c7de54d05342bf0e47c2634c3103fa063dbfaa785763a7a60a687977e302c74ea18c78e7f2b1f73b3027ea0211c94f2d3724902d76f8af912a11ee444'; // Verwende einen sicheren Schlüssel und speichere ihn sicher

// MySQL-Datenbankverbindung
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Wu:@z2![gwhQR3bf<#[.', // Ersetze dies mit deinem MySQL root Passwort
  database: 'NodeBase'
});

db.connect((err) => {
  if (err) throw err;
  console.log('MySQL connected...');
  
  // Beispiel Benutzer erstellen
  const testUser = { name: 'TestUser', password: 'password123' };
  const saltRounds = 10;

  bcrypt.hash(testUser.password, saltRounds, (err, hash) => {
    if (err) throw err;
    const sql = `INSERT INTO user (name, password) VALUES (?, ?)`;
    db.query(sql, [testUser.name, hash], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          console.log('TestUser already exists.');
        } else {
          throw err;
        }
      } else {
        console.log('TestUser created successfully.');
      }
    });
  });
});

app.use(express.json());

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "localhost:3000"); // Korrigiere die Origin
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  next();
});

// Middleware zur JWT-Verifizierung
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Extrahiere den Token aus dem Header

  if (!token) {
    return res.status(403).json({ message: 'Kein Token angegeben.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Token ist ungültig.' });
    }
    req.user = decoded; // Benutzerinformationen für die Verwendung in den Routen speichern
    next();
  });
};

// Login-Route
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  // Benutzer aus der Datenbank holen
  const sql = `SELECT * FROM user WHERE name = ?`;
  db.query(sql, [email], (err, results) => {
    if (err) {
      console.error('Fehler beim Abrufen des Benutzers:', err);
      return res.status(500).json({ message: 'Fehler beim Abrufen des Benutzers.' });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: 'Ungültige Anmeldedaten.' });
    }

    const user = results[0];

    // Überprüfen des Passworts
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        console.error('Fehler bei der Passwortüberprüfung:', err);
        return res.status(500).json({ message: 'Fehler bei der Passwortüberprüfung.' });
      }

      if (!isMatch) {
        return res.status(401).json({ message: 'Ungültige Anmeldedaten.' });
      }

      // JWT erstellen
      const token = jwt.sign({ id: user.id, email: user.name }, JWT_SECRET, { expiresIn: '1h' });
      res.json({ message: 'Login erfolgreich', token });
    });
  });
});

// Geschützte Route für Benutzerdaten
app.get('/api/data', verifyToken, (req, res) => {
  // Die Route ist jetzt geschützt und nur für authentifizierte Benutzer zugänglich
  const data = { message: "Hello from the server...changed...", name: req.user.email };
  res.json(data);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});