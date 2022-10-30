"use strict";

const path = require("path");
const fs = require("fs");
const Files = require("../modules/Mysql/Files");
const Storage = require("../modules/Mysql/Storage");
const Progress = require("../modules/Mysql/Progress");
const FilesVideo = require("../modules/Mysql/FilesVideo");
const { Sequelize, Op } = require("sequelize");
const shell = require("shelljs");
const { GenerateID, SettingValue } = require("../modules/Function");

module.exports = async (req, res) => {
  const { sv_ip, slug } = req.query;
  try {
    if (!sv_ip) return res.json({ status: false });

    //let setting = await SettingValue(true);

    let {
      stg_status,
      stg_dl_by,
      stg_dl_sort,
      stg_auto_cancle,
      stg_max_use,
      stg_focus_uid,
    } = await SettingValue(true);

    // check status all

    if (stg_status != 1)
      return res.json({ status: false, msg: `status_inactive` });

    let where = {},
      where_files = {},
      data = {},
      limit = 5;

    where.sv_ip = sv_ip;
    where.work = 0;
    //where.active = 1;

    //find server
    const ServerEmpty = await Storage.findOne({ where });

    if (!ServerEmpty) {
      //check auto cancal
      if (stg_auto_cancle) {
        delete where.work;
        const sv = await Storage.findOne({
          where,
          raw: true,
          attributes: ["id"],
        });

        if (sv?.id) {
          let ovdl = await Progress.findOne({
            where: {
              sid: sv?.id,
              [Op.and]: Sequelize.literal(
                `ABS(TIMESTAMPDIFF(SECOND , createdAt , NOW())) >= ${stg_auto_cancle}`
              ),
            },
            raw: true,
          });

          if (ovdl) {
            //get token
            const get_token = await FilesVideo.findOne({
              where: {
                slug: ovdl?.slug,
                quality: ovdl?.quality,
              },
              attributes: ["token"],
              raw: true,
            });

            //delete localfile
            if (get_token?.token) {
              // delete token
              shell.exec(
                `sudo rm -rf /home/files/${get_token?.token}/`,
                { async: false, silent: false },
                function (data) {}
              );
            }

            //update files
            await Files.update(
              { e_code: 333 },
              {
                where: { id: ovdl.fid },
                silent: true,
              }
            );
            //update files_video
            await FilesVideo.update(
              { token: "" },
              {
                where: { fid: ovdl.fid },
                silent: true,
              }
            );
            // delete process
            await Progress.destroy({ where: { id: ovdl?.id } });

            //check over download again
            let ca_ovdl = await Progress.findOne({
              where: {
                sid: sv?.id,
                [Op.and]: Sequelize.literal(
                  `ABS(TIMESTAMPDIFF(SECOND , createdAt , NOW())) >= ${stg_auto_cancle}`
                ),
              },
              raw: true,
            });

            if (!ca_ovdl) {
              //set server not work
              await Storage.update(
                { work: 0 },
                {
                  where: { id: sv?.id },
                  silent: true,
                }
              );
            }
            //exit no update server
          }
          // exit no process
        }
        // exit no server
      }
      // exit no auto cancle
      return res.json({ status: false, msg: `Server not empty` });
    }

    if (ServerEmpty?.disk_percent >= (stg_max_use || 90)) {
      /*await Storage.update(
        { active: 0 },
        {
          where: { sv_ip: sv_ip },
          silent: true,
        }
      );*/
      return res.json({ status: false, msg: `Server disk not empty` });
    }

    if (slug) where_files.slug = slug;

    //find files
    where_files.active = {
      [Op.or]: [0, 1],
    };

    where_files.status = {
      [Op.or]: [2, 4],
    };

    where_files.e_code = {
      [Op.or]: [0, 2, 151],
    };
    //new function focus_uid
    if (stg_focus_uid) {
      where_files.uid = {
        [Op.or]: stg_focus_uid.split(","),
      };

      const count_files = await Files.count({
        where: where_files,
      });

      if (!count_files) {
        delete where_files.uid;
      }
    }
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

    const FilesEmpty = await Files.findAll({
      where: where_files,
      order: set_order,
      limit: limit,
    });

    FilesEmpty.forEach((row) => {
      console.log(row?.slug);
    });

    const i = Math.floor(Math.random() * FilesEmpty.length);
    console.log(i, FilesEmpty.length);
    if (!FilesEmpty[0])
      return res.json({ status: false, msg: `Files not empty` });

    let file = FilesEmpty[i];

    if (!file?.slug)
      return res.json({ status: false, msg: `Files not empty 2` });

    //find video

    const Videos = await FilesVideo.findAll({
      row: true,
      where: { slug: file?.slug },
    });

    if (!Videos[0]) {
      // Create Video default
      let data_default = {};
      data_default.uid = file?.uid;
      data_default.fid = file?.id;
      data_default.slug = file?.slug;
      data_default.active = 1;
      data_default.quality = "default";
      data_default.token = GenerateID(50);
      data_default.backup = file?.backup;
      data_default.mimesize = file?.mimesize;
      data_default.filesize = file?.filesize;
      //find FilesVideo
      const FindFilesVideo = await FilesVideo.findOne({
        where: {
          slug: data_default.slug,
          quality: "default",
        },
      });

      if (!FindFilesVideo) await FilesVideo.create(data_default);

      data.uid = file?.uid;
      data.sid = ServerEmpty?.id;
      data.fid = file?.id;
      data.type = "storage";
      data.slug = file?.slug;
      data.quality = "default";

      //const insert = await Progress.create(data);

      //Update
      /*await Storage.update(
        { work: 1 },
        {
          where: { id: data.sid },
          silent: true,
        }
      );*/

      /*if(file.e_code == 0){
        await Files.update(
          { e_code: 1 },
          {
            where: { id: file.id },
            silent: true,
          }
        );
      }

      shell.exec(`bash /home/node/shell/download.sh ${data?.slug}`, {async: false, silent: false}, function(data){});
*/
      return res.json({
        status: true,
        msg: `Process default created`,
        slug: data.slug,
      });
    } else {
      // has video data
      if (Videos.length > 1) {
        let backup = [];

        Videos.forEach((item) => {
          let bdata = {};
          if (item.quality != "default") {
            backup.push(item.quality);
          }
        });

        //console.log(backup.join("|"))

        if (backup.length > 0) {
          data.quality = backup.join("|");
          //return res.json({ status: false , download:backup });
        } else {
          return res.json({ status: false });
        }
      } else {
        let dt_video = Videos[0];
        data.quality = dt_video?.quality;
      }
      data.uid = file?.uid;
      data.sid = ServerEmpty?.id;
      data.fid = file?.id;
      data.type = "storage";
      data.slug = file?.slug;

      //const insert = await Progress.create(data);

      //Update
      /*await Storage.update(
          { work: 1 },
          {
            where: { id: data.sid },
            silent: true,
          }
        );

        await Files.update(
          { e_code: 1 },
          {
            where: { id: file.id },
            silent: true,
          }
        );

        shell.exec(`bash /home/node/shell/download.sh ${data?.slug}`, {async: false, silent: false}, function(data){});
*/
      return res.json({
        status: true,
        msg: `Process ${data.quality}`,
        slug: data.slug,
      });
    }
  } catch (error) {
    console.log(error);
    return res.json({ status: false, msg: error.name });
  }
};
