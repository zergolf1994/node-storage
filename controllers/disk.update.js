"use strict";
const path = require("path");
const Storage = require("../modules/Mysql/Storage");

module.exports = async (req, res) => {
  const { sv_ip, disk_total, disk_used } = req.query;

  try {
    if (!sv_ip) return res.json({ status: false, msg: "no sv ip" });
    if (!disk_total) return res.json({ status: false, msg: "no disk_total" });
    if (!disk_used) return res.json({ status: false, msg: "no disk_usage" });

    let disk_percent = ((disk_used * 100) / disk_total ?? 0).toFixed(0);

    const data_update = {
      disk_percent,
      disk_used,
      disk_total,
    };

    if(disk_percent >= 90){
      data_update.active = 0
    }

    //Update
    await Storage.update(
      data_update,
      {
        where: { sv_ip: sv_ip },
        silent: true,
      }
    );

    return res.json({ status: true });
  } catch (error) {
    return res.json({ status: false, msg: error.name });
  }
};
