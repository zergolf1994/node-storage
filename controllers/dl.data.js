"use strict";

const path = require("path");
const fs = require("fs");
const Files = require("../modules/Mysql/Files");
const Backup = require("../modules/Mysql/Backup");
const Storage = require("../modules/Mysql/Storage");
const Progress = require("../modules/Mysql/Progress");
const { Sequelize, Op } = require("sequelize");
const shell = require("shelljs");
const {
  SettingValue,
  getSourceGdrive,
  GenerateID,
} = require("../modules/Function");
const FilesVideo = require("../modules/Mysql/FilesVideo");

module.exports = async (req, res) => {
  const { slug, quality } = req.query;
  try {
    if (!slug) return res.json({ status: false, msg: "not_slug_file" });

    const pc = await Progress.findOne({
      raw: true,
      where: {
        type: "storage",
        slug: slug,
      },
    });

    if (!pc) return res.json({ status: false, msg: "not_process_data" });

    if (!quality) {
      let qual = pc?.quality.split(",");
      return res.json({ status: true, quality: qual });
    } else {
      let where = {};
      where.slug = slug;
      where.quality = quality;

      const bu = await Backup.findOne({
        raw: true,
        where,
      });

      if (!bu) return res.json({ status: false, msg: "not_backup_data" });

      let vi = await FilesVideo.findAll({
        raw: true,
        where,
      });

      if (!vi.length) {
        //create video
        let vi_created = {};

        vi_created.token = GenerateID(50);
        vi_created.quality = bu?.quality;
        vi_created.fid = bu?.fid;
        vi_created.slug = bu?.slug;
        vi_created.backup = bu?.backup;
        vi_created.mimesize = bu?.mimesize;
        vi_created.filesize = bu?.filesize;
        vi = await FilesVideo.create(vi_created);
      } else {
        vi = vi[0];
      }

      return res.json({
        status: true,
        data: vi,
      });
    }
  } catch (error) {
    console.log(error);
    return res.json({ status: false, msg: error.name });
  }
};
