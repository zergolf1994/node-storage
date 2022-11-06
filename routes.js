"use strict";
const express = require("express");
const router = express.Router();
const moment = require("moment");

router.all("/", (req, res) =>
  res.status(200).json({ status: false, msg: "zembed.xyz" })
);

router.get("/run", require("./controllers/run"));
router.get("/dl/run", require("./controllers/dl.run"));
router.get("/download/start", require("./controllers/dl.start"));
router.get("/download/data", require("./controllers/dl.data"));
router.get("/download/done", require("./controllers/dl.done"));
router.get("/disk/update", require("./controllers/disk.update"));
//server
router.get("/server/create", require("./controllers/server.create"));
//gdrive info
router.get("/gdrive/info", require("./controllers/gdrive.info"));
//slave
router.get("/slave/start", require("./controllers/slave.start"));
router.get("/slave/done", require("./controllers/slave.done"));

//delete files
//delete one file

//delete bulkfiles

//get tree file
router.get("/files/list", require("./controllers/files.lists"));
router.get("/files/check", require("./controllers/files.check"));

router.get("/test/start", require("./controllers/test.start"));

router.all("*", function (req, res) {
  res.status(404).json({ status: false, msg: "zembed.xyz" });
});
module.exports = router;
