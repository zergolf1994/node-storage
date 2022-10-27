'use strict'

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();

require('dotenv').config();

let corsOptions = {
    origin: '*',
    optionsSuccessStatus: 200
}
app.use(cors(corsOptions));
//app.use(express.static(path.join(__dirname, 'public')))
app.use(express.static('/home/files'))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
app.options('*', (req, res, next) => res.end());
app.use(require('./routes'));
require('http').createServer(app).listen(8888);