"use strict";

const path = require("path");
const fs = require("fs");
const Storage = require("../modules/Mysql/Storage");

module.exports = async (req, res) => {
  const { sv_ip , sv_name } = req.query;
  try {
    if(!sv_ip) return res.json({ status: false});

    let where = {},data = {};
    where.sv_ip = sv_ip;
    where.type = "storage";

    //find server
    const ServerExists = await Storage.findOne({ where });

    if(!ServerExists){

        data.sv_ip = sv_ip;
        data.sv_name = sv_name || sv_ip;
        data.type = "storage";

        const insert = await Storage.create(data);

        if(insert?.id){
            return res.json({ status: true , msg: `${sv_ip} created` });
        } else {
            return res.json({ status: false , msg: `false insert` });
        }
       
    }else{
        return res.json({ status: false , msg: `${sv_ip} already exists` });
    }

  } catch (error) {
    return res.json({ status: false, msg: error.name });
  }
};
