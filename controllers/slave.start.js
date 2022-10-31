"use strict";

const path = require("path");
const Files = require("../modules/Mysql/Files");
const Storage = require("../modules/Mysql/Storage");
const FilesVideo = require("../modules/Mysql/FilesVideo");
const Progress = require("../modules/Mysql/Progress");
const { Sequelize, Op } = require("sequelize");
const shell = require("shelljs");

let inputPath, gid;

module.exports = async (req, res) => {
  const { slug, quality, token, file_name, slave_ip } = req.query;
  try {
    if (!slug || !slave_ip) return res.json({ status: false });
    //if (!quality) return res.json({ status: false });
    shell.exec(
      `bash /home/node/shell/slave.sh ${slug} ${slave_ip}`,
      { async: false, silent: false },
      function (data) {}
    );
    return res.json({ status: true , bash:`bash /home/node/shell/slave.sh ${slug} ${slave_ip}`});
  } catch (error) {
    console.log(error);
    return res.json({ status: false, msg: error.name });
  }
};