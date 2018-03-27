'use strict';

var pluralize = require('pluralize');
var utils = require('./utils');
var  Q = require('q');

module.exports = function (router,db, name,basePath) {
  // Create router
  //var router = express.Router();

  basePath = basePath || "";


  // Embed function used in GET /name and GET /name/id
  function embed(resource, e) {
    var darr = [];
    e && [].concat(e).forEach(function (externalResource) {
        var query = {};
        var singularResource = pluralize.singular(name);
        query[singularResource + 'Id'] = resource.id;
        darr.push(db.get(externalResource).find(query).then(function(result){
          resource[externalResource] = result;
        }));
    });
    return Q.all(darr).then(function(){
      return resource;
    });
  }

  // Expand function used in GET /name and GET /name/id
  function expand(resource, e) {
    var darr = [];
    e && [].concat(e).forEach(function (innerResource) {
      var plural = pluralize(innerResource);
      var prop = innerResource + 'Id';
      darr.push(db.get(plural).get(resource[prop]).then(function(result){
        resource[innerResource]  = result;
      }));
    });

    return Q.all(darr).then(function(){
      return resource;
    });
  }

  // GET /name
  // GET /name?q=
  // GET /name?attr=&attr=
  // GET /name?_end=&
  // GET /name?_start=&_end=&
  // GET /name?_embed=&_expand=
  function list(req, res, next) {
    var _embed = req.query._embed;
    var _expand = req.query._expand;
    delete req.query._expand;
    delete req.query._embed;
    
    // Resource chain
    var r = db.get(name).query(req.query).then(function(items){
      // embed and expand
      var darr =[];

      items.forEach(function (element) {
        darr.push(embed(element, _embed).then(function(){
          return expand(element, _expand);
        }));

      });
      
       return Q.all(darr).then(function(){
         return items;
       });

    });

    // Remove q, _start, _end, ... from req.query to avoid filtering using those
    // parameters


    //res.locals.data = chain.value();
    utils.respond(r,res);

  }

  // GET /name/:id
  // GET /name/:id?_embed=&_expand
  function show(req, res, next) {
    var _embed = req.query._embed;
    var _expand = req.query._expand;

    utils.respond(db.get(name).get(req.params.id).then(function(resource){
        // Embed other resources based on resource id
        // /posts/1?_embed=comments
        return embed(resource, _embed).then(function(){
          // Expand inner resources based on id
          // /posts/1?_expand=user
            return expand(resource, _expand);
        })
    }),res);

  }

  // POST /name
  function create(req, res, next) {
    utils.respond(db.get(name).add(req.body),res,{
      status : 201
    });
  }

  // PUT /name/:id
  function replace(req, res, next) {
    utils.respond(db.get(name).replace(req.params.id,req.body),res);
  }

  // PATCH /name/:id
  function update(req, res, next) {
    utils.respond(db.get(name).update(req.params.id,req.body),res);
  }

  // DELETE /name/:id
  function destroy(req, res, next) {
    utils.respond(db.get(name).remove(req.params.id),res);
  }

  router.route(basePath + '/' + name).get(list).post(create);

  router.route(basePath + '/' +name + '/:id').get(show).put(replace).patch(update).delete(destroy);

  return router;
};