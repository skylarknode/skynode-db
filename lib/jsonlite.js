'use strict';

var _ = require('lodash');
var _db = require('underscore-db');
var low = require('lowdb');
var FileSync = require('lowdb/adapters/FileSync');
var validateData = require('./validate');
var mixins = require('./mixins');
var  Q = require('q');
const debug = require('debug')('skynode-db:jsonlite');


var    BaseDbConn = require('./base');

function resolvedPromise(val) {
    var d = Q.defer();
    d.resolve(val);
    return d.promise;
}

/** @class JsonliteDb
    @extends BaseDbConn */
var JsonliteDb = BaseDbConn.extend(
/** @lends MongoDb# */
{
    /** @method */
    initialize: function(name, opts = {}) {
        this._name = name;
        this._opts = opts;        

        this._directory = opts.directory;
        this._masterFileName = opts.master_file_name || "master.json";
        this._masterFilePath = this._directory + "/" + this._masterFileName;
        	
        this._spaces = {
        };
        this._tablespaces = {
        };

	      this._masterSpace = this._openTableSpace(this._masterFilePath);
	      this._tables = this._masterSpace.get("tables");
        debug("tables:" + JSON.stringify(this._tables.value()));
        this._stores = {};
    },

    _openTableSpace: function(jsonFilePath) {
        var adapter = new FileSync(jsonFilePath),
            space = low(adapter),
            self = this;

        validateData(space.getState());

        // Add underscore-db methods to db
        space._.mixin(_db);

        // Add specific mixins
        space._.mixin(mixins);

        space.forEach(function(value, key) {
            self._tablespaces[key] = space;
        }).value();

        return space;
    },

    ensureSpace: function(tableName) {
        debug("tableName:" + tableName);
        var space = this._tablespaces[tableName];
        if (!space) {
            var meta = this._tables.find({
                name: tableName
            }).value();
            debug("meta:" + JSON.stringify(meta));
            if (meta) {
                space = this._spaces[meta.spaceFileName];
                if (!space) {
                    space = this._spaces[meta.spaceFileName] = this._openTableSpace(this._directory + "/" + meta.spaceFileName);
                }
            }
        }
        return space;
    },

    /** @method */
    list: function() {
        //TODO
    },

    /** @method */
    get: function(name, options) {
        debug("name:" + name);
        var store = this._stores[name];
        if (!store) {
            store = this._stores[name] = new JsonliteDb.JsonliteStore(this,name,options);
        }
        return store;
    },

    /** @method */
    create: function(name, options) {
        var space = this.ensureSpace(name);
        if (!space) {
            options.spaceFileName = options.spaceFileName || name + ".json";
            this._tables.insert({
                name: name,
                spaceFileName: options.spaceFileName
            }).value();
            space = this.ensureSpace(name);
        }

        return space;
    },

    /** @method */
    drop: function(name) {
        // TODO
    },

    has : function(name) {
        var space = this._tablespaces[name];
        return !!space;
    },

    set : function(name, data) {
        var space = ensureSpace(name);
        if (space) {
            space.set(name, data);
        }
        return this;
    },

    push : function(name, data) {
        return this.get(name).push(data).write();
    }
});


/** @class JsonliteStore
    @extends BaseStore */
JsonliteDb.JsonliteStore = BaseDbConn.BaseStore.extend({
/** @lends MongoStore# */

    /** @method */
    initialize: function(db, name, options) {
        BaseDbConn.BaseStore.prototype.initialize.call(this, db, name, options);
        this.space = db.ensureSpace(name);
        this._ = this.space.get(name);
    },

    all : function(data) {
        if (data !== undefined) {
            this.db.set(this.name,data);
        }
        return resolvedPromise(this._.value());
    },

    assign : function(object) {
        var id = this._getObjectKey(object);
        return this.update(id,object);
    },

    /** @method */
    get: function(id) {
        return resolvedPromise(this._.getById(id).value());
    },

    /** @method */
    add: function(object) {
        object = _.clone(object);

        return resolvedPromise(this._.insert(object).value());
    },

    /** @method */
    put: function(object) {
        object = _.clone(object);
        var key = this._getObjectKey(object);

        return resolvedPromise(this._.replaceById(key,object).value());
    },

    /** @method */
    update: function(id, attrs) {
        return resolvedPromise(this._.updateById(id,attrs).value());
    },

    /** @method */
    updateWhere: function(directives,attrs) {
        return resolvedPromise(this._.updateWhere(directives,attrs).value());
    },

    /** @method */
    remove: function(id) {
        return resolvedPromise(this._.removeById(id).value());
    },

    /** @method */
    removeWhere: function(directives) {
        return resolvedPromise(this._.removeWhere(directives).value());
    },

    find : function(cond) {
      return resolvedPromise(this._.find(cond).value());
    },

    /** Execute RQL query */
    query: function(query) {

        var q = query.q;
        var _start = query._start;
        var _end = query._end;
        var _page = query._page;
        var _sort = query._sort;
        var _order = query._order;
        var _limit = query._limit;
        delete query.q;
        delete query._start;
        delete query._end;
        delete query._sort;
        delete query._order;
        delete query._limit;
        delete query._embed;
        delete query._expand;

        const self = this;

        // Automatically delete query parameters that can't be found
        // in the database
        Object.keys(query).forEach(function (query) {
          var arr = self._.value();
          for (var i in arr) {
            if (_.has(arr[i], query) || query === 'callback' || query === '_' || /_lte$/.test(query) || /_gte$/.test(query) || /_ne$/.test(query) || /_like$/.test(query)) return;
          }
          delete query[query];
        });
        var chain = this._;

        if (q) {
          // Full-text search
          q = q.toLowerCase();

          chain = chain.filter(function (obj) {
            for (var key in obj) {
              var value = obj[key];
              if (db._.deepQuery(value, q)) {
                return true;
              }
            }
          });
        }

        Object.keys(query).forEach(function (key) {
          // Don't take into account JSONP query parameters
          // jQuery adds a '_' query parameter too
          if (key !== 'callback' && key !== '_') {
            (function () {
              // Always use an array, in case req.query is an array
              var arr = [].concat(query[key]);

              chain = chain.filter(function (element) {
                return arr.map(function (value) {
                  var isDifferent = /_ne$/.test(key);
                  var isRange = /_lte$/.test(key) || /_gte$/.test(key);
                  var isLike = /_like$/.test(key);
                  var path = key.replace(/(_lte|_gte|_ne|_like)$/, '');
                  var elementValue = _.get(element, path);

                  if (elementValue === undefined) {
                    return;
                  }

                  if (isRange) {
                    var isLowerThan = /_gte$/.test(key);

                    return isLowerThan ? value <= elementValue : value >= elementValue;
                  } else if (isDifferent) {
                    return value !== elementValue.toString();
                  } else if (isLike) {
                    return new RegExp(value, 'i').test(elementValue.toString());
                  } else {
                    return value === elementValue.toString();
                  }
                }).reduce(function (a, b) {
                  return a || b;
                });
              });
            })();
          }
        });

        // Sort
        if (_sort) {
          _order = _order || 'ASC';

          chain = chain.sortBy(function (element) {
            return _.get(element, _sort);
          });

          if (_order === 'DESC') {
            chain = chain.reverse();
          }
        }


        if (_page) {
          _page = parseInt(_page, 10);
          _page = _page >= 1 ? _page : 1;
          _limit = parseInt(_limit, 10) || 10;
          var page = utils.getPage(chain.value(), _page, _limit);
          var links = {};
          var fullURL = getFullURL(req);

          if (page.first) {
            links.first = fullURL.replace('page=' + page.current, 'page=' + page.first);
          }

          if (page.prev) {
            links.prev = fullURL.replace('page=' + page.current, 'page=' + page.prev);
          }

          if (page.next) {
            links.next = fullURL.replace('page=' + page.current, 'page=' + page.next);
          }

          if (page.last) {
            links.last = fullURL.replace('page=' + page.current, 'page=' + page.last);
          }

          res.links(links);
          chain = _.chain(page.items);
        } else if (_end) {
          _start = parseInt(_start, 10) || 0;
          _end = parseInt(_end, 10);
          chain = chain.slice(_start, _end);
        } else if (_limit) {
          _start = parseInt(_start, 10) || 0;
          _limit = parseInt(_limit, 10);
          chain = chain.slice(_start, _start + _limit);
        }

        
        return resolvedPromise(this._.filter(query).value());
    },

    /** Delete all items */
    clear: function() {
        return this.all([]);
    }
});

module.exports = JsonliteDb;