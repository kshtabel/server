//Test connection to database and
var mysql = require('mysql2');

var con = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Wu:@z2![gwhQR3bf<#[.',
    database: 'NodeBase'
});

con.connect(function(error) {
    if (error) throw error;
    console.log('Successfull connected to db');

    var sql = 'alter table user modify name not null';

    con.query(sql, function(err, resullt) {
        if (err) throw err;

        console.log('Table user column name modified');
    })
})