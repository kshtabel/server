const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');


var con = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Wu:@z2![gwhQR3bf<#[.',
    database: 'NodeBase'
});

con.connect(function(error) {
    if (error) throw error;
    console.log('Successfully connected to the database');

    // SQL-Query, um die Spalte 'name' in der Tabelle 'user' nicht null zu machen
    var sql = 'ALTER TABLE user MODIFY name VARCHAR(255) NOT NULL';

    con.query(sql, function(err, result) {
        if (err) throw err;
        console.log('Table user column name modified');
    });

    // Überprüfen, ob ein Admin-Benutzer bereits existiert
    const checkAdminSql = "SELECT * FROM user WHERE role = 'admin'";

    con.query(checkAdminSql, async function(err, result) {
        if (err) throw err;

        if (result.length === 0) {
            // Wenn kein Admin existiert, einen neuen Admin-Benutzer erstellen
            const adminPassword = ']HCw!KKMqJJaM?eGE0&&gU=6#X4GyP'; // Ändere das Passwort zu einem sicheren Passwort
            const hashedPassword = await bcrypt.hash(adminPassword, 10); // Passwort hashen

            const insertAdminSql = `INSERT INTO user (name, password, role) VALUES ('Admin', '${hashedPassword}', 'admin')`;

            con.query(insertAdminSql, function(err, result) {
                if (err) throw err;
                console.log('Admin user created successfully');
            });
        } else {
            console.log('Admin user already exists');
        }
    });
});