"use strict";

const path = require("path");
const fs = require("fs");
const FilesVideo = require("../modules/Mysql/FilesVideo");
const Storage = require("../modules/Mysql/Storage");
const Progress = require("../modules/Mysql/Progress");
const { Sequelize, Op } = require("sequelize");
const { GenerateID } = require("../modules/Function");

module.exports = async (req, res) => {
  const { sv_ip, slug , quality } = req.query;
  try {
    if (!slug) return res.json({ status: false });

    let where_files = {},
      where_data = {},
      data = {};

    //find process
    where_data.type = "storage";
    where_data.slug = slug;
    //where_data.quality = "default";

    const FindData = await Progress.findOne({ raw:true, where: where_data });

    if (!FindData)
      return res.json({ status: false, msg: `Progress not found` });
    
    if(!quality){
      let qual = FindData?.quality.split("|")
      return res.json({ status: true , quality : qual });
    }else{
      where_files.slug = slug;
      where_files.active = 1;
      where_files.sv_id = 0;
      where_files.quality = quality;

      const FindFiles = await FilesVideo.findOne({ raw:true, where: where_files });
      if (!FindFiles) return res.json({ status: false, msg: `Files not found` });
      if(!FindFiles?.token){
        data.token = GenerateID(50)

        await FilesVideo.update(data,
          {
            where: where_files,
            silent: true,
          }
        );
      }else{
        data.token = FindFiles?.token;
      }


      data.title = quality;
      data.backup = FindFiles?.backup;
      data.quality = quality;

      return res.json({ status: true , data });
    }

  } catch (error) {
    return res.json({ status: false, msg: error.name });
  }
};
