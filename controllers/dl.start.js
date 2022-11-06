"use strict";

const path = require("path");
const fs = require("fs");
const Files = require("../modules/Mysql/Files");
const FilesVideo = require("../modules/Mysql/FilesVideo");
const Storage = require("../modules/Mysql/Storage");
const Progress = require("../modules/Mysql/Progress");
const Backup = require("../modules/Mysql/Backup");
const { Sequelize, Op } = require("sequelize");
const shell = require("shelljs");
const {
  SettingValue,
  timeSleep,
  getSourceGdrive,
} = require("../modules/Function");

module.exports = async (req, res) => {
  const { sv_ip, slug } = req.query;
  let no_uid = [];
  try {
    if (!sv_ip) return res.json({ status: false, msg: "no_query_sv_ip" });

    let {
      stg_status,
      stg_dl_by,
      stg_dl_sort,
      stg_auto_cancle,
      stg_max_use,
      stg_focus_uid,
    } = await SettingValue(true);

    const storages = await Storage.findAll({
      raw: true,
      attributes: ["uid"],
      where: {
        type: "storage",
      },
    });
    if (storages.length) {
      storages.forEach((el, index) => {
        let { uid } = el;
        if (!no_uid.includes(uid) && uid != 0) {
          no_uid.push(uid);
        }
      });
    }
    // เช็คเซิฟว่าง
    const storage = await Storage.findOne({
      raw: true,
      where: {
        sv_ip: sv_ip,
        type: "storage",
        active: 1,
        work: 0,
      },
    });

    if (!storage) {
      //เช็ค process file
      return res.json({ status: false, msg: "server_is_busy" });
    }
    // check status all
    if (stg_status != 1)
      return res.json({ status: false, msg: `status_inactive` });

    let file_where = {};

    if (storage?.uid) {
      file_where.uid = storage?.uid;
    } else if (!storage?.uid && no_uid.length > 0) {
      file_where.uid = { [Op.notIn]: no_uid };
    }
    //console.log(storage);

    file_where.status = { [Op.or]: [2, 4] };
    file_where.active = 1;
    file_where.e_code = 0;
    file_where.type = { [Op.or]: ["gdrive", "direct"] };

    let file_limit = storages.length;

    let set_order = [[Sequelize.literal("RAND()")]];

    if (stg_dl_sort && stg_dl_by) {
      let order_sort = stg_dl_sort == "asc" ? "ASC" : "DESC";
      let order_by = "createdAt";
      switch (stg_dl_by) {
        case "size":
          order_by = "filesize";
          break;
        case "view":
          order_by = "views";
          break;
        case "update":
          order_by = "viewedAt";
          break;
        case "viewat":
          order_by = "updatedAt";
          break;
      }

      set_order = [[order_by, order_sort]];
    }

    //console.log(file_where);
    await timeSleep(1);

    const files = await Files.findAll({
      where: {
        ...file_where,
        ...[
          Sequelize.literal(
            `slug IN ( SELECT slug FROM backups GROUP BY slug HAVING COUNT( * ) > 0 )`
          ),
        ],
      },
      order: set_order,
      limit: file_limit,
    });
    if (!files.length) {
      return res.json({ status: false, msg: `files_not_empty`, e: 1 });
    }

    const number = Math.floor(Math.random() * files.length);
    let file = files[number];

    if (!file?.slug)
      return res.json({ status: false, msg: `files_not_empty`, e: 2 });

    //เช็ค backup && file_videos
    const bu = await Backup.findAll({
      raw: true,
      attributes: ["quality"],
      where: {
        slug: file?.slug,
      },
    });

    if (!bu) return res.json({ status: false, msg: `not_backup_files`, e: 1 });
    let backup = [];
    if (bu.length > 0) {
      bu.forEach((el) => {
        if (!backup.includes(el?.quality)) {
          backup.push(el?.quality);
        }
      });
    }

    let process_data = {};

    process_data.quality = backup.join();
    process_data.uid = file?.uid;
    process_data.sid = storage?.id;
    process_data.fid = file?.id;
    process_data.type = "storage";
    process_data.slug = file?.slug;
    //return res.json({ status: false, msg: process_data });

    /*const videos = await FilesVideo.findAll({
      raw: true,
      attributes: ["quality", "slug"],
      where: {
        slug: file?.slug,
      },
    });*/
    
    const create = await Progress.create(process_data);

    /*return res.json({
      status: false,
      msg: "no_query_sv_ip",
      process_data,
    });*/

    if (!create?.id) return res.json({ status: false, msg: `db_false` });

    await Storage.update(
      { work: 1 },
      {
        where: { id: process_data.sid },
        silent: true,
      }
    );
    await Files.update(
      { e_code: 1 },
      {
        where: { id: process_data.fid },
        silent: true,
      }
    );
    await timeSleep(2);

    shell.exec(
      `sudo bash ${global.dir}/shell/download.sh ${file?.slug}`,
      { async: false, silent: false },
      function (data) {}
    );

    return res.json({
      status: true,
      msg: "start_download",
      slug: file?.slug,
    });
  } catch (error) {
    console.log(error);
    return res.json({ status: false, msg: error.name });
  }
};
