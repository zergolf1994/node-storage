"use strict";
const express = require("express");
const router = express.Router();
const moment = require("moment");

router.all("/", (req, res) =>
  res
    .status(200)
    .json({ status: false, msg: "welcom to zembed", date: moment().format() })
);

router.get('/run' , require('./controllers/run'));
router.get('/download/start' , require('./controllers/download.start'));
router.get('/download/data' , require('./controllers/download.data'));
router.get('/download/done' , require('./controllers/download.done'));
router.get('/disk/update' , require('./controllers/disk.update'));
//server
router.get('/server/create' , require('./controllers/server.create'));
//gdrive info
router.get('/gdrive/info' , require('./controllers/gdrive.info'));

router.all("*", function (req, res) {
  res.status(404).json({ status: false, msg: "page not found", date: moment().format() })
});
module.exports = router;
