"use strict";

const path = require("path");
const Files = require("../modules/Mysql/Files");
const Storage = require("../modules/Mysql/Storage");
const Servers = require("../modules/Mysql/Servers");
const FilesVideo = require("../modules/Mysql/FilesVideo");
const Progress = require("../modules/Mysql/Progress");
const { Sequelize, Op } = require("sequelize");
const ffmpeg = require("fluent-ffmpeg");

let inputPath, gid;

module.exports = async (req, res) => {
  const { slug, quality, slave_ip, sv_ip } = req.query;
  let ss_id, sl_ip;
  try {
    if (!slug) return res.json({ status: false });
    let where = {},
      where_files = {},
      where_data = {},
      data = {};

    //find process
    where_data.type = "slave";
    where_data.slug = slug;

    const FindData = await Progress.findOne({ where: where_data });

    if (!FindData)
      return res.json({ status: false, msg: `Progress not found` });

    if (quality) {
      if (!sv_ip) return res.json({ status: false });

      let data_files = {},
        data_videos = {};

      const storage = await Storage.findOne({
        where: {
          sv_ip: sv_ip,
        },
      });

      if (!storage)
        return res.json({ status: false, msg: `storage not found` });

      ss_id = storage?.id;

      const FindVideo = await FilesVideo.findOne({
        where: {
          slug: slug,
          quality: quality,
          active: 1,
          sv_id: 0,
        },
      });

      if (!FindVideo)
        return res.json({ status: false, msg: `Video not found` });

      const file = await Files.findOne({ where: { slug: slug } });

      if (!file?.mimesize || !file?.duration) {
        let ext = file?.mimetype.split("/")[1];
        inputPath = `/home/files/${FindVideo?.token}/file_${quality}.${ext}`;
        let ffmpeg_data = await getVideoData();

        if (!file?.mimesize) {
          data_files.mimesize = `${ffmpeg_data?.streams[0].width}x${ffmpeg_data?.streams[0].height}`;
          data_videos.mimesize = data_files.mimesize;
        }
        if (!file?.duration) {
          data_files.duration = Math.floor(ffmpeg_data?.format?.duration) || 0;
        }
        await Files.update(data_files, {
          where: { slug: slug },
          silent: true,
        });
      }

      // update fileVideo
      data_videos.sv_id = ss_id;
      await FilesVideo.update(data_videos, {
        where: { id: FindVideo?.id },
        silent: true,
      });
      return res.json({ status: true, msg:`Done Quality ${quality}` });
    } else {
      //done
      if (!slave_ip) return res.json({ status: false });

      if (FindData?.quality == "default") {
        data.status = 3;
      } else {
        data.status = 5;

        await FilesVideo.update(
          { active: 0 },
          {
            where: { slug: slug, quality: "default" },
            silent: true,
          }
        );
      }

      data.e_code = 0;
      await Files.update(data, {
        where: { id: FindData.fid, e_code: 1 },
        silent: true,
      });
      // update server
      await Servers.update(
        { work: 0 },
        {
          where: { id: FindData.sid },
          silent: true,
        }
      );
      
      // delete process
      await Progress.destroy({ where: { id: FindData.id } });

      return res.json({ status: true, msg:`Done ${slug}` });
    }

  } catch (error) {
    console.log(error);
    return res.json({ status: false, msg: error.name });
  }
};

function getVideoData() {
  return new Promise((resolve, reject) => {
    if (!inputPath) {
      resolve({});
    }
    ffmpeg(inputPath).ffprobe((err, data) => {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
}
