'use strict';

const utils = require('./utils');

module.exports = function (router,db, name,basePath) {
  //var router = app;//express.Router();
  basePath = basePath || "";

  function show(req, res, next) {
    //res.locals.data = db.get(name).value();
    utils.respond(db.get(name).all(),res);
  }

  function create(req, res, next) {
    utils.respond(db.get(name).all(req.body),res,{
      status : 201
    });
  }

  function replace(req, res, next) {
    utils.respond(db.get(name).all(req.body),res);
  }

  function update(req, res, next) {
    utils.respond(db.get(name).assign(req.body),res);
  }

  router.route(basePath + '/' + name).get(show).post(create).put(replace).patch(update);

  return router;
};