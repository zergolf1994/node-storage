"use strict";

const path = require("path");
const fs = require("fs");
const Files = require("../modules/Mysql/Files");
const Storage = require("../modules/Mysql/Storage");
const Progress = require("../modules/Mysql/Progress");
const FilesVideo = require("../modules/Mysql/FilesVideo");
const { Sequelize, Op } = require("sequelize");
const shell = require("shelljs");
const { GenerateID } = require("../modules/Function");

module.exports = async (req, res) => {
  const { sv_ip , slug } = req.query;
  try {
    if (!sv_ip) return res.json({ status: false });

    let where = {},
      where_files = {},
      data = {},
      limit = 5;

    where.sv_ip = sv_ip;
    where.work = 0;
    where.active = 1;

    //find server
    const ServerEmpty = await Storage.findOne({ where });

    if (!ServerEmpty)
      return res.json({ status: false, msg: `Server not empty` });

    if(ServerEmpty?.disk_percent >= 90){
      await Storage.update(
        { active: 0 },
        {
          where: { sv_ip: sv_ip },
          silent: true,
        }
      );
      return res.json({ status: false, msg: `Server disk not empty` });
    }

    if(slug) where_files.slug = slug;

    //find files 
    where_files.active = {
      [Op.or] : [0,1]
    }

    where_files.status = {
      [Op.or] : [2,4]
    }

    where_files.e_code = {
      [Op.or] : [0,2,151]
    }

    const FilesEmpty = await Files.findAll({
      where: where_files,
      order: [[Sequelize.literal("RAND()")]],
      limit: limit,
    });

    const i = Math.floor(Math.random() * FilesEmpty.length);

    if (!FilesEmpty[0])
      return res.json({ status: false, msg: `Files not empty` });

    let file = FilesEmpty[i];

    if (!file?.slug)
      return res.json({ status: false, msg: `Files not empty 2` });

    //find video

    const Videos = await FilesVideo.findAll({
      row:true,
      where: {slug:file?.slug}
    });

    if(!Videos[0]){
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
      const FindFilesVideo = await FilesVideo.findOne({ where:{
        slug:data_default.slug,quality:"default"
      } });

      if (!FindFilesVideo)
        await FilesVideo.create(data_default);

      data.uid = file?.uid;
      data.sid = ServerEmpty?.id;
      data.fid = file?.id;
      data.type = "storage";
      data.slug = file?.slug;
      data.quality = "default";

      const insert = await Progress.create(data);

      //Update
      await Storage.update(
        { work: 1 },
        {
          where: { id: data.sid },
          silent: true,
        }
      );

      if(file.e_code == 0){
        await Files.update(
          { e_code: 1 },
          {
            where: { id: file.id },
            silent: true,
          }
        );
      }

      shell.exec(`bash /home/node/shell/download.sh ${data?.slug}`, {async: false, silent: false}, function(data){});

      return res.json({
        status: true,
        msg: `Process default created`,
        slug: data.slug,
      });
    }else{
      // has video data
      if(Videos.length > 1){
        let backup = [];

        Videos.forEach((item) => {
          let bdata = {}
          if(item.quality != "default"){
            backup.push(item.quality)
          }
        });

        //console.log(backup.join("|"))

        if(backup.length > 0){
          data.quality = backup.join("|");
          //return res.json({ status: false , download:backup });
        }else{
          return res.json({ status: false });
        }
      }else{
        let dt_video = Videos[0];
        data.quality = dt_video?.quality;
      }
        data.uid = file?.uid;
        data.sid = ServerEmpty?.id;
        data.fid = file?.id;
        data.type = "storage";
        data.slug = file?.slug;

        const insert = await Progress.create(data);

        //Update
        await Storage.update(
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

        return res.json({
          status: true,
          msg: `Process ${data.quality}`,
          slug: data.slug,
        });
    }
  } catch (error) {
    console.log(error)
    return res.json({ status: false, msg: error.name });
  }
};
