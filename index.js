const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');
const app = express();
const port = 3000;
const cors = require('cors');
require('dotenv').config({path: '../server/.env'})
const path = require('path');
const multer = require('multer');
const saltRounds = 10;
const axios = require('axios');
const http = require('http');

// Statische Dateien aus dem Ordner 'uploads' bereitstellen
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const JWT_SECRET = process.env.JWT_SECRET; // Verwende einen sicheren Schlüssel und speichere ihn sicher

////////////////////// SERVER FUNC  //////////////////////

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "localhost:3000"); // Korrigiere die Origin
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  next();
});

app.use(express.json());

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

// Funktion zum Generieren einer zufälligen Base58-Zeichenfolge
function generateRandomBase58(length) {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }
  return result;
}

// Multer-Konfiguration für Dateiuploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Dateiname basierend auf Zeitstempel
  },
});

const upload = multer({ storage });

function requireRole(role) {
  return function (req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      console.log('Kein Token gefunden.');
      return res.status(403).json({ message: 'Kein Token gefunden.' });
    }

    const token = authHeader.split(' ')[1]; // Bearer Token
    if (!token) {
      console.log('Token nicht im Authorization Header vorhanden.');
      return res.status(403).json({ message: 'Kein Token gefunden.' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        console.log('Token-Verifizierung fehlgeschlagen:', err);
        return res.status(403).json({ message: 'Ungültiger Token.' });
      }

      console.log('Decoded Token:', decoded);
      if (decoded.role !== role) {
        console.log('Benutzerrolle stimmt nicht überein. Erwartet:', role, 'Erhalten:', decoded.role);
        return res.status(403).json({ message: 'Zugriff verweigert. Nicht genügend Rechte.' });
      }

      req.user = decoded;
      next();
    });
  };
}

// MySQL-Datenbankverbindung
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Wu:@z2![gwhQR3bf<#[.', // Ersetze dies mit deinem MySQL root Passwort
  database: 'NodeBase'
});

// Endpoint: /api/market-data
app.get('/api/market-data', async (req, res) => {
  try {
    const response = await axios.get('https://min-api.cryptocompare.com/data/price', {
      params: {
        fsym: 'BTC',
        tsyms: 'USD',
      },
      headers: {
        authorization: `Apikey ${process.env.DEV_CRYPTOCOMPARE_API}`, // API-Key im Header
      },
    });

    const marketData = response.data;
    const timestamp = Date.now();

    // Senden der Marktdaten an das Frontend
    res.json({
      price: marketData.USD,
      timestamp: timestamp,
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Marktdaten:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Marktdaten' });
  }
});

// Login-Route
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

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

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        console.error('Fehler bei der Passwortüberprüfung:', err);
        return res.status(500).json({ message: 'Fehler bei der Passwortüberprüfung.' });
      }

      if (!isMatch) {
        return res.status(401).json({ message: 'Ungültige Anmeldedaten.' });
      }

      const token = jwt.sign({ id: user.id, email: user.name, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
      res.json({ message: 'Login erfolgreich', token });
    });
  });
});

////////////////////// END SERVER FUNC //////////////////////


////////////////////// API ADMIN //////////////////////

// Geschützte Admin-Route
app.get('/api/admin', requireRole('admin'), (req, res) => {
  res.json({ message: 'Willkommen, Admin!' });
});

// Admin Route
// /api/admin/getUsers
app.get('/api/admin/getUsers', requireRole('admin'), (req, res) => {
  const sql = `
    SELECT 
      user.id, 
      user.name, 
      user.role, 
      wallets.wallet_address,
      wallets.wallet_balance
    FROM user 
    LEFT JOIN wallets ON user.wallet_id = wallets.id
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Fehler beim Abrufen der Benutzer:', err);
      return res.status(500).json({ message: 'Fehler beim Abrufen der Benutzer.' });
    }

    res.json(results);
  });
});

// Admin Route
// api/admin/deleteUser/:id
app.delete('/api/admin/deleteUser/:id', requireRole('admin'), (req, res) => {
  const userId = req.params.id;

  // Zuerst holen wir die wallet_id des Benutzers
  const getWalletIdSql = `SELECT wallet_id FROM user WHERE id = ?`;
  
  db.query(getWalletIdSql, [userId], (err, result) => {
    if (err) {
      console.error('Fehler beim Abrufen der Wallet-ID:', err);
      return res.status(500).json({ message: 'Fehler beim Abrufen der Wallet-ID.' });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden.' });
    }

    const walletId = result[0].wallet_id;

    // Lösche den Benutzer aus der Tabelle user
    const deleteUserSql = `DELETE FROM user WHERE id = ?`;
    
    db.query(deleteUserSql, [userId], (err, result) => {
      if (err) {
        console.error('Fehler beim Löschen des Benutzers:', err);
        return res.status(500).json({ message: 'Fehler beim Löschen des Benutzers.' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Benutzer nicht gefunden.' });
      }

      // Lösche die Wallet-Daten, falls eine wallet_id existiert
      if (walletId) {
        const deleteWalletSql = `DELETE FROM wallets WHERE id = ?`;

        db.query(deleteWalletSql, [walletId], (err, result) => {
          if (err) {
            console.error('Fehler beim Löschen der Wallet-Daten:', err);
            return res.status(500).json({ message: 'Fehler beim Löschen der Wallet-Daten.' });
          }

          res.json({ message: 'Benutzer und zugehörige Wallet erfolgreich gelöscht.' });
        });
      } else {
        res.json({ message: 'Benutzer erfolgreich gelöscht. Keine Wallet-Daten gefunden.' });
      }
    });
  });
});

// Admin Route
// api/admin/addUser
app.post('/api/admin/addUser', requireRole('admin'), (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ message: 'Bitte alle erforderlichen Felder ausfüllen.' });
  }

  // Prüfe, ob der Benutzer bereits existiert
  const checkUserSql = `SELECT * FROM user WHERE name = ?`;
  db.query(checkUserSql, [username], (err, results) => {
    if (err) {
      console.error('Fehler beim Überprüfen des Benutzers:', err);
      return res.status(500).json({ message: 'Fehler beim Überprüfen des Benutzers.' });
    }

    if (results.length > 0) {
      return res.status(400).json({ message: 'Benutzername ist bereits vergeben.' });
    }

    // Generiere eine Beispiel-BTC-Wallet-Adresse mit einem gültigen Format
    const walletAddress = `1${generateRandomBase58(33)}`;

    // Füge die Wallet-Adresse zur Tabelle wallets hinzu
    const addWalletSql = `INSERT INTO wallets (wallet_address) VALUES (?)`;
    db.query(addWalletSql, [walletAddress], (err, walletResult) => {
      if (err) {
        console.error('Fehler beim Hinzufügen der Wallet-Adresse:', err);
        return res.status(500).json({ message: 'Fehler beim Erstellen der Wallet-Adresse.' });
      }

      const walletId = walletResult.insertId; // ID der erstellten Wallet

      // Hash das Passwort
      bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
          console.error('Fehler beim Hashen des Passworts:', err);
          return res.status(500).json({ message: 'Fehler beim Speichern des Benutzers.' });
        }

        // Füge den Benutzer zur Datenbank hinzu, einschließlich der wallet_id
        const addUserSql = `INSERT INTO user (name, password, role, wallet_id) VALUES (?, ?, ?, ?)`;
        db.query(addUserSql, [username, hash, role, walletId], (err, result) => {
          if (err) {
            console.error('Backend: Fehler beim Hinzufügen des Benutzers:', err);
            return res.status(500).json({ message: 'Fehler beim Hinzufügen des Benutzers.' });
          }

          res.status(201).json({ message: 'Benutzer erfolgreich hinzugefügt.' });
        });
      });
    });
  });
});

////////////////////// END API ADMIN //////////////////////

////////////////////// API USER //////////////////////

// API endpoint for user registration
app.post('/api/registration', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Check if the user already exists
    const userCheckQuery = 'SELECT id FROM user WHERE name = ?';
    db.query(userCheckQuery, [username], async (err, results) => {
      if (err) {
        console.error('Error checking user:', err);
        return res.status(500).json({ message: 'Error checking user.' });
      }

      if (results.length > 0) {
        // User already exists
        return res.json({ status: 'USER_EXIST_Y' });
      } else {
        try {
          // Hash the password
          const hashedPassword = await bcrypt.hash(password, saltRounds);

          // Generate a new wallet address and set balance to 0
          const walletAddress = generateRandomBase58(34);
          const walletBalance = '0.00000000';

          // Insert new wallet into the wallets table
          const insertWalletQuery = 'INSERT INTO wallets (wallet_address, wallet_balance) VALUES (?, ?)';
          db.query(insertWalletQuery, [walletAddress, walletBalance], (err, walletResult) => {
            if (err) {
              console.error('Error creating wallet:', err);
              return res.status(500).json({ message: 'Error creating wallet.' });
            }

            // Get the newly created wallet ID
            const walletId = walletResult.insertId;

            // Insert new user into the user table with the wallet_id
            const insertUserQuery = 'INSERT INTO user (name, password, wallet_id) VALUES (?, ?, ?)';
            db.query(insertUserQuery, [username, hashedPassword, walletId], (err) => {
              if (err) {
                console.error('Error creating user:', err);
                return res.status(500).json({ message: 'Error creating user.' });
              }

              // Registration successful
              return res.json({ status: 'USER_EXIST_N' });
            });
          });
        } catch (error) {
          console.error('Error during password hashing or wallet creation:', error);
          return res.status(500).json({ message: 'Registration failed during hashing or wallet creation.' });
        }
      }
    });
  } catch (error) {
    console.error('Error during registration:', error);
    return res.status(500).json({ message: 'Registration failed.' });
  }
});

// GET /api/user/wallet - Holt die Wallet-Adresse des angemeldeten Benutzers
app.get('/api/user/wallet', verifyToken, (req, res) => {
  const userId = req.user.id;

  const sql = `SELECT w.wallet_address FROM wallets w
               JOIN user u ON u.wallet_id = w.id
               WHERE u.id = ?`;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error('Fehler beim Abrufen der Wallet-Adresse:', err);
      return res.status(500).json({ message: 'Fehler beim Abrufen der Wallet-Adresse.' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Wallet-Adresse nicht gefunden.' });
    }

    res.json({ wallet_address: results[0].wallet_address });
  });
});

// GET /api/user/wallet/:id - Fetch wallet address and balance by user ID
app.get('/api/user/wallet/:id', (req, res) => {
  const userId = req.params.id; // Get the user ID from the URL

  // SQL query to fetch wallet address and balance based on the wallet ID
  const sql = `
    SELECT w.wallet_address, w.wallet_balance
    FROM wallets w
    JOIN user u ON u.wallet_id = w.id
    WHERE u.id = ?
  `;

  // Execute the query
  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching wallet data:', err);
      return res.status(500).json({ message: 'Error fetching wallet data.' });
    }

    // Check if wallet data is found
    if (results.length === 0) {
      return res.status(404).json({ message: 'No wallet found for this user.' });
    }

    // Return the wallet address and balance
    const walletData = {
      wallet_address: results[0].wallet_address,
      wallet_balance: results[0].wallet_balance
    };

    res.json(walletData);
  });
});

// API Endpunkt: /api/user/wallet/transactions/:id
app.get('/api/user/wallet/transactions/:id', (req, res) => {
  const userId = req.params.id;

  // SQL query to get transactions by user ID
  const sqlQuery = 'SELECT * FROM transactions WHERE user_id = ?';

  db.query(sqlQuery, [userId], (err, results) => {
    if (err) {
      console.error('Fehler beim Abrufen der Transaktionsdaten:', err);
      return res.status(500).json({ error: 'Fehler beim Abrufen der Transaktionsdaten.' });
    }

    // Return the retrieved transactions to the frontend
    res.status(200).json(results);
  });
});

// PUT /api/user/wallet - Aktualisiert die Wallet-Adresse des angemeldeten Benutzers
app.put('/api/user/wallet', verifyToken, (req, res) => {
  const userId = req.user.id;
  const { wallet_address } = req.body;

  if (!wallet_address) {
    return res.status(400).json({ message: 'Wallet-Adresse erforderlich.' });
  }

  const sql = `UPDATE wallets w
               JOIN user u ON u.wallet_id = w.id
               SET w.wallet_address = ?
               WHERE u.id = ?`;

  db.query(sql, [wallet_address, userId], (err, result) => {
    if (err) {
      console.error('Fehler beim Aktualisieren der Wallet-Adresse:', err);
      return res.status(500).json({ message: 'Fehler beim Aktualisieren der Wallet-Adresse.' });
    }

    res.json({ message: 'Wallet-Adresse erfolgreich aktualisiert.' });
  });
});

// GET /api/data
app.get('/api/data', verifyToken, (req, res) => {
  // Die Route ist jetzt geschützt und nur für authentifizierte Benutzer zugänglich
  const data = { message: "Hello from the server...changed...", name: req.user.email };
  res.json(data);
});

////////////////////// END API USER //////////////////////

////////////////////// REAL ESTATE API //////////////////////

// API-Endpunkt zum Abrufen der Immobilien
app.get('/api/realEstate', (req, res) => {
  // SQL-Abfrage, um die Immobilien und ihre zugehörigen Bilder zu erhalten
  const sqlQuery = `
    SELECT re.id, re.title, re.description, re.detailedDescription, re.price, rei.image_path
    FROM realEstate AS re
    LEFT JOIN realEstateImages AS rei ON re.id = rei.realEstate_id
  `;

  db.query(sqlQuery, (err, results) => {
    if (err) {
      console.error('Fehler beim Abrufen der Immobilien:', err);
      return res.status(500).json({ error: 'Fehler beim Abrufen der Immobilien' });
    }

    // Immobilien-Objekte zusammenstellen, inklusive ihrer Bilder
    const realEstateMap = {};

    results.forEach((row) => {
      if (!realEstateMap[row.id]) {
        realEstateMap[row.id] = {
          id: row.id,
          title: row.title,
          description: row.description,
          detailedDescription: row.detailedDescription,
          price: row.price,
          images: [] // Bilder werden hinzugefügt
        };
      }

      // Bilder zur jeweiligen Immobilie hinzufügen (wenn vorhanden)
      if (row.image_path) {
        realEstateMap[row.id].images.push(row.image_path);
      }
    });

    // Immobilien in ein Array umwandeln und zurückgeben
    const realEstateList = Object.values(realEstateMap);
    res.json(realEstateList);
  });
});

// API-Endpunkt zum Erstellen einer Immobilie
app.post('/api/realEstate/createEstate', upload.array('images', 10), (req, res) => {
  const { title, description, detailedDescription, price } = req.body;

  // Schritt 1: Immobilie in die Tabelle "realEstate" einfügen
  const insertRealEstate = `INSERT INTO realEstate (title, description, detailedDescription, price, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())`;

  db.query(insertRealEstate, [title, description, detailedDescription, price], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Fehler beim Erstellen der Immobilie' });
    }

    const realEstateId = result.insertId; // Die ID der neu erstellten Immobilie

    // Schritt 2: Bilder in die Tabelle "realEstateImages" einfügen
    const imagePaths = req.files.map((file) => ['uploads/' + file.filename, realEstateId]);

    const insertImages = `INSERT INTO realEstateImages (image_path, realEstate_id) VALUES ?`;

    db.query(insertImages, [imagePaths], (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Fehler beim Speichern der Bilder' });
      }

      res.status(200).json({ message: 'Immobilie und Bilder erfolgreich erstellt.' });
    });
  });
});

// Immobilien und ihre Bilder löschen
app.delete('/api/realEstate/delete/:id', requireRole('admin'), (req, res) => {
  const realEstateId = req.params.id;

  // SQL-Anfragen, um die Immobilie und die zugehörigen Bilder zu löschen
  const deleteImagesQuery = 'DELETE FROM realestateimages WHERE realestate_id = ?';
  const deleteRealEstateQuery = 'DELETE FROM realestate WHERE id = ?';

  db.query(deleteImagesQuery, [realEstateId], (err) => {
    if (err) {
      console.error('Fehler beim Löschen der Bilder:', err);
      return res.status(500).json({ error: 'Fehler beim Löschen der Bilder' });
    }

    db.query(deleteRealEstateQuery, [realEstateId], (err) => {
      if (err) {
        console.error('Fehler beim Löschen der Immobilie:', err);
        return res.status(500).json({ error: 'Fehler beim Löschen der Immobilie' });
      }

      res.status(200).json({ success: true });
    });
  });
});

////////////////////// END REAL ESTATE API //////////////////

////////////////////// Server //////////////////////

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

////////////////////// END SERVER //////////////////