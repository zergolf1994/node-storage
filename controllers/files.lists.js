"use strict";

const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");

const getDirs = (source) =>
  fs
    .readdirSync(source, {
      withFileTypes: true,
    })
    .reduce((a, c) => {
      c.isDirectory() && a.push(c.name);
      return a;
    }, []);

const getFiles = (source) =>
  fs
    .readdirSync(source, {
      withFileTypes: true,
    })
    .reduce((a, c) => {
      c.isFile() && a.push(c.name);
      return a;
    }, []);

let inputPath;
module.exports = async (req, res) => {
  const { token, file } = req.query;
  try {
    let data = {};

    if (token && !file) {
      let getdir = path.join(global.files, token);
      if (!fs.existsSync(getdir)) {
        return res.json({ status: false, msg: "not_found_folder" });
      }
      data.token = token;
      data.files = getFiles(getdir);
    } else if (token && file) {
      let getdir = path.join(global.files, token);
      if (!fs.existsSync(getdir)) {
        return res.json({ status: false, msg: "not_found_folder" });
      }
      let files = getFiles(getdir);
      if (!files.includes(file)) {
        return res.json({ status: false, msg: "not_found_video" });
      }

      inputPath = path.join(global.files, token, file);
      data.token = token;
      data.file = file;
      data.video_data = await getVideoData();
    } else {
      let allDir = getDirs(global.files);
      data.count = allDir.length;
      data.token = allDir;
    }

    return res.status(200).json({ status: true, data });
  } catch (error) {
    console.log(error);
    return res.json({ status: false, msg: error.name });
  }
};

function getVideoData() {
  if (fs.existsSync(inputPath)) {
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
  } else {
    return;
  }
}
