'use strict';

const utils = require('./utils');

module.exports = function (router,db, name) {
  //var router = app;//express.Router();

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

  router.route('/' + name).get(show).post(create).put(replace).patch(update);

  return router;
};