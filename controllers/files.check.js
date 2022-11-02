"use strict";

const FilesVideo = require("../modules/Mysql/FilesVideo");
const Storage = require("../modules/Mysql/Storage");
const { Sequelize, Op } = require("sequelize");
const { getDirs, getFiles } = require("../modules/Function");
const shell = require("shelljs");

module.exports = async (req, res) => {
  let sv_id,
    tokens = [],
    tokenNotdataCount = 0;
  let listDirs = getDirs(global.files);
  if (listDirs[0]) {
    //find data
    const video = await FilesVideo.findOne({ where: { token: listDirs[0] } });
    if (video?.sv_id) sv_id = video?.sv_id;
  }

  if (!sv_id) return res.status(200).json({ status: false });

  let double_slug = [],
    delete_table_video_id = [];
  // เช็คไฟล์ ซ้ำ
  const videos = await FilesVideo.findAll({
    raw: true,
    attributes: ["id", "token", "slug", "quality"],
    where: {
      slug: Sequelize.literal(
        `slug IN ( SELECT slug FROM files_videos GROUP BY slug HAVING COUNT( * ) >1 )`
      ),
      quality: Sequelize.literal(
        `quality IN ( SELECT quality FROM files_videos GROUP BY quality HAVING COUNT( * ) >1 )`
      ),
    },
    order: [["slug", "ASC"]],
  });

  if (videos.length > 0) {
    videos.forEach((el) => {
      double_slug.push(el.slug);
    });
    let unique_slug = double_slug.filter(onlyUnique);

    unique_slug.forEach((slug, i) => {
      let dd = videos.filter(function (item) {
        return item.slug == slug;
      });
      if (dd.length > 1) {
        dd.forEach((el, index) => {
          if (index > 0) {
            delete_table_video_id.push(el?.id);
          }
        });
      }
    });
    // ลบไฟล์ซ้ำ เหลือ ไว้ 1
    if (delete_table_video_id.length) {
      await FilesVideo.destroy({ where: { id: delete_table_video_id } });
    }
  }

  const vdo = await FilesVideo.findAll({
    raw: true,
    attributes: ["token", "slug", "quality"],
    where: { token: { [Op.ne]: "" }, sv_id: { [Op.ne]: 0 } },
  });

  if (vdo.length > 0) {
    let tokenAll = [];
    vdo.forEach((el) => {
      tokenAll.push(el.token);
      if (!listDirs.includes(el.token)) {
        tokenAll.push(el.token);
      }
    });
    listDirs.forEach((token) => {
      if (!tokenAll.includes(token)) {
        shell.exec(
          `sudo rm -rf ${global.files}/${token}`,
          { async: false, silent: false },
          function (data) {
            console.log("Delete", token);
          }
        );
        shell.exec(
          `echo "echo 3 > /proc/sys/vm/drop_caches"`,
          { async: false, silent: false },
          function (data) {}
        );
        //tokenNotdata.push(token);
        tokenNotdataCount++;
      }
    });
    if (tokenNotdataCount > 0) {
      shell.exec(
        `bash ${global.dir}/shell/update-disk.sh`,
        { async: true, silent: false },
        function (data) {
          console.log(`Update Disk`);
        }
      );
    }
    //tokens = tokenAll.filter(onlyUnique);
  }
  //console.log(videos.length);
  return res.status(200).json({
    Notdata: tokenNotdataCount,
  });
};
function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}
