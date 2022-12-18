const _ = require('lodash'); 

/** @class BaseDbConn */
function BaseDbConn() {
    this.initialize.apply(this, arguments);
}

_.extend(BaseDbConn.prototype,
/** @lends BaseDbConn# */
{
    /** Initialize the backend instance */
    initialize: function(options) {
        options = _.extend({}, options || {});
        this.options = options;    
    },

    /** List store names (e.g. tables for SQL, collections for MongoDB)
        @abstract */
    list: function() {

    },

    /** Get object store
     * @abstract */
    get: function(name, options) {

    },


    /** Check object store
     * @abstract */
    has : function(name) {
        var space = tablespaces[tableName];
        return !!space;
    },

    /** Create object store
        @abstract */
    create: function(name, options) {

    },

    /** Delete object store
        @abstract */
    drop : function(name) {

    },

    open : function() {

    },

    close : function() {

    },

    commit : function() {

    },

    rollback : function() {

    },

    routing : function(router,basePath) {
        var self = this;
        return {
            plural : function (names) {
                var r = require("./router/plural");
                if (typeof names === 'string') {
                    names = [names];
                } 
                names.forEach(function(name){
                    r(router,self,name,basePath);
                });                
            },
            singular : function (names) {
                var r = require("./router/singular");
                if (typeof names === 'string') {
                    names = [names];
                } 
                names.forEach(function(name){
                    r(router,self,name,basePath);
                });                
            }
        };
    }

});



/** @class Collection */
function Collection() {
    this.initialize.apply(this, arguments);
}

_.extend(Collection.prototype,
/** @lends Collection# */
{
    /** Initialize the backend instance
        @constructs */
    initialize: function(db, name, options) {
        options = _.extend({keyPath: 'id'}, options || {});
        this.options = options;

        this.db = db;
        this.name = name;
        this.keyPath = this.options.keyPath;
    },


    /** Get or set all  items  
        @abstract */
    all: function(data) {

    },

    /** Update a item  
        @abstract */
    assign: function(object) {

    },

    /** Get a item  by id(aka READ)
        @abstract */
    get: function(id) {

    },

    /** Add a item  (aka CREATE, insert)
        @abstract */
    add: function(object) {

    },


    /** Put a item (aka REPLACE/CREATE)
        @abstract */
    put: function(object) {

    },

    /** Update a item (aka UPDATE)
        @abstract */
    update: function(id, attrs) {

    },

    /** Update items by condition (aka UPDATE)
        @abstract */
    updateWhere: function(directives,attrs) {

    },

    /** Delete a item by id (aka DELETE)
        @abstract */
    remove : function(id){

    },

    /** Delete  items by condition (aka DELETE)
        @abstract */
    removeWhere : function(directives){

    },

    /** Find items
        @abstract */
    find: function(filter) {

    },

    /** Execute  query
        @abstract */
    query: function(query) {

    },

    /** Delete all items
        @abstract */
    clear: function() {

    },

    /** Extract key value from object
        @private */
    _getObjectKey: function(obj, key) {
        if (typeof key === 'object') {
            key = key.key;
        }
        return key || obj[this.keyPath];
    }
});

// Taken from Backbone:

  // Shared empty constructor function to aid in prototype-chain creation.
  var ctor = function(){};

  // Helper function to correctly set up the prototype chain, for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  var inherits = function(parent, protoProps, staticProps) {
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && protoProps.hasOwnProperty('constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ parent.apply(this, arguments); };
    }

    // Inherit class (static) properties from parent.
    _.extend(child, parent);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _.extend(child.prototype, protoProps);

    // Add static properties to the constructor function, if supplied.
    if (staticProps) _.extend(child, staticProps);

    // Correctly set child's `prototype.constructor`.
    child.prototype.constructor = child;

    // Set a convenience property in case the parent's prototype is needed later.
    child.__super__ = parent.prototype;

    return child;
  };

  // The self-propagating extend function that Backbone classes use.
  var extend = function (protoProps, classProps) {
    var child = inherits(this, protoProps, classProps);
    child.extend = this.extend;
    return child;
  };

/** Class inheritance */
Collection.extend = extend;

/** Class inheritance */
BaseDbConn.extend = extend;
BaseDbConn.Collection = Collection;

module.exports = BaseDbConn;