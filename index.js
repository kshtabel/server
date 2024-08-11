const express = require('express');
const app = express();
const port = 3000;

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "localhost:3000"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

app.get('/api/data', (req, res) => {
    const data = { message: "Hello from the server...changed..."}
    res.json(data);
});

app.listen(port, () => {
    console.log('Server is running on port {port}')
});