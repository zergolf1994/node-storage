"use strict";

const shell = require("shelljs");
const fs = require("fs-extra");
const path = require("path");

module.exports = async (req, res) => {
    
  if (!token) return res.json({ status: false });
  let delete_dir = path.join(global.files, token);

  return res.status(200).json(delete_dir);

};
