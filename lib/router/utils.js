"use strict";

const  debug = require('debug')('skynode-db:utils');


module.exports = {
  getPage: getPage,
  respond: respond
};

function getPage(array, page, perPage) {
  var obj = {};
  var start = (page - 1) * perPage;
  var end = page * perPage;

  obj.items = array.slice(start, end);
  if (obj.items.length === 0) {
    return obj;
  }

  if (page > 1) {
    obj.prev = page - 1;
  }

  if (end < array.length) {
    obj.next = page + 1;
  }

  if (obj.items.length !== array.length) {
    obj.current = page;
    obj.first = 1;
    obj.last = Math.ceil(array.length / perPage);
  }

  return obj;
}

function respond(promise, res,params) {
    promise
        .then(function (result) {
            //debug("result:" + JSON.stringify(result));
            console.log({
              a :3 
            });

            console.log(result);
            params = params || {};
            if (params.status) {
              res.status(params.status);
            }

            // Slice result
            if (params.end || params.limit || params.page) {
              if (params.size) {
                res.setHeader('X-Total-Count', params.size);
              }
              res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count' + (params.page ? ', Link' : ''));
            }
        

            //res.send(JSON.stringify(result));
            res.json(result);
        })
        .fail(function (err) {
            res.statusCode = err.code || 500;
            console.error(err);
            res.send(String(err));
        });
}
