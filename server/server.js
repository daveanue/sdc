const express = require('express');
const app = express();
const path = require('path');
const PORT = 3000;

app.use(express.json());



app.listen(PORT, () => {
  console.log(`Server listening at localhost:${3000}!`);
});