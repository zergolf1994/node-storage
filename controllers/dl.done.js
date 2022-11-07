"use strict";

const path = require("path");
const fs = require("fs");
const Files = require("../modules/Mysql/Files");
const FilesVideo = require("../modules/Mysql/FilesVideo");
const Backup = require("../modules/Mysql/Backup");
const Storage = require("../modules/Mysql/Storage");
const Progress = require("../modules/Mysql/Progress");

const { Sequelize, Op } = require("sequelize");
const shell = require("shelljs");

module.exports = async (req, res) => {
  const { slug, quality, token } = req.query;
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
      // update files done
      const file = await Files.findOne({
        where: {
          slug: slug,
        },
      });
      let data = {};
      if (file?.status == 4) {
        data.status = 5;
        if (pc?.quality !== "default") {
          //delete default video
          await FilesVideo.destroy({
            where: { slug: slug, quality: "default" },
          });
        }
      } else {
        data.status = 3;
      }

      data.e_code = 0;
      await Files.update(data, {
        where: { id: pc?.fid, e_code: 1 },
        silent: true,
      });
      // update server
      await Storage.update(
        { work: 0 },
        {
          where: { id: pc?.sid },
          silent: true,
        }
      );
      // delete process
      await Progress.destroy({ where: { id: pc?.id } });

      shell.exec(
        `bash ${global.dir}/shell/run.sh`,
        { async: false, silent: false },
        function (data) {}
      );

      return res.json({ status: true, msg: "download_done" });
    } else {
      if (!token) return res.json({ status: false, msg: "not_token_file" });
      // update files_video done

      await FilesVideo.update(
        { active: 1, sv_id: pc?.sid, uid: pc?.uid },
        {
          where: { slug: slug, token: token },
          silent: true,
        }
      );

      return res.json({
        status: true,
        msg: `Update ${slug} ${quality} Done`,
      });
    }
  } catch (error) {
    console.log(error);
    return res.json({ status: false, msg: error.name });
  }
};
