var persist = require('persist'),
    Q = require('q'),
    _ = require('underscore'),
    util = require('util'),
    BaseDbConn = require('./base');

/** @class SqlDbConn 
    @extends BaseDbConn */
var SqlDbConn = BaseDbConn.extend(
/** @lends SqlDbConn# */
{
    /** @method */
    initialize: function(options) {
        options = _.extend({driver: 'sqlite3'}, SqlDbConn.defaults, options || {});
        this.options = options;

        this._opened = null;
    },

    /** @method */
    list: function() {
        var sql = (this.options.driver === 'sqlite3') ? 
              "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
            : "SHOW TABLES;";
        return this.runSqlAll(sql);
    },

    /** @method */
    get: function(name, options) {
        return new Collection(this, name, options);
    },

    /** @method */
    create: function(name, options) {
        throw 'Not implemented - please use CREATE TABLE query';
    },

    /** @method */
    drop: function(name) {
        return this.runSql('DROP TABLE ' + Collection.prototype.escapeIdentifier(name));
    },

    /** @method */
    open: function() {
        if (!this._opened) {
            this._opened = Q.ninvoke(persist, 'connect', this.options);
        }
        return this._opened;
    },

    /** @method */
    close: function() {
        throw 'Not implemented!';
    },

    /** @method */
    isClosed: function() {
        return Q.defer()
                .resolve(!!this._opened);
    },

    /** @method */
    runSql: function(sql, values) {
        return this.open().then(function(connection) {
            return Q.ninvoke(connection, 'runSql', sql, values||[]);
        });
    },

    /** @method */
    runSqlAll: function(sql, values) {
        return this.open().then(function(connection) {
            return Q.ninvoke(connection, 'runSqlAll', sql, values||[]);
        });
    },
});

SqlDbConn.defaults = {
    host: 'localhost',
    port: 3306,
    database: 'default'
};


/** @class Collection
    @extends Collection */
var Collection = BaseDbConn.Collection.extend(
/** @lends Collection# */
{
    /** @method */
    get: function(directives) {
        var key = this._getObjectKey({}, directives),
            sql = util.format('SELECT * FROM %s WHERE %s = ?;',
                              this.escapeIdentifier(this.name),
                              this.escapeIdentifier(this.keyPath));
        
        return this.runSqlAll(sql, [key])
            .then(function(result) {
                return result[0] || {};
            });
    },

    /** @method */
    add: function(object, directives) {
        var args = [],
            placeholders = [],
            self = this;

        for (var k in object) {
            args.push(object[k]);
            placeholders.push(this.escapeIdentifier(k));
        }

        var sql = util.format('INSERT INTO %s (%s) VALUES (%s);',
                              this.escapeIdentifier(this.name),
                              placeholders.join(','),
                              args.map(function() {return '?';}).join(','));

        return this.runSql(sql, args)
            .then(function(result) {
                // handle autoincrement
                if (result.insertId) {
                    // MySQL
                    object[self.keyPath] = result.insertId;
                } else if (result.lastId) {
                    // Sqlite
                    object[self.keyPath] = result.lastId;
                }
                return object;
            });
    },

    /** @method */
    put: function(object, directives) {
        var key = this._getObjectKey(object, directives),
            args = [],
            placeholders = [];

        for (var k in object) {
            args.push(object[k]);
            placeholders.push(this.escapeIdentifier(k)+'=?');
        }

        args.push(key);

        var sql = util.format('UPDATE %s SET %s WHERE %s = ?;',
                              this.escapeIdentifier(this.name),
                              placeholders.join(','),
                              this.escapeIdentifier(this.keyPath));

        return this.runSql(sql, args)
            .then(function(result) {
                return object;
            });
    },

    /** @method */
    remove :function(directives) {
        var key = this._getObjectKey({}, directives),
            sql = util.format('DELETE FROM %s WHERE %s = ?;',
                              this.escapeIdentifier(this.name),
                              this.escapeIdentifier(this.keyPath));

        return this.runSql(sql, [key])
            .then(function(result) {
                // return number of affected rows
                var ret = 0;
                if ('affectedRows' in result) {
                    // MySQL
                    ret = result.affectedRows;
                } else if ('changes' in result) {
                    // Sqlite
                    ret = result.changes;
                }
                return ret;
            });
    },

    /** Execute RQL query */
    query: function(query) {
        var sql = this.parse(query);

        return this.runSqlAll(sql, [])
            .then(function(result) {
                if (result[0] && result[0][0]) {
                  // sqlite
                  result = result[0];
                }
                return result || [];
            });
    },

    /** Get connection object */
    connection: function() {
        return this.db.open();
    },

    /** Delete all items */
    clear: function() {
        var sql = util.format('DELETE FROM %s;', this.escapeIdentifier(this.name));
        return this.runSql(sql);
    },

    /** @method */
    runSql: function(sql, values) {
        return this.db.runSql(sql, values);
    },

    /** @method */
    runSqlAll: function(sql, values) {
        return this.db.runSqlAll(sql, values);
    },

    /**
     * Parse  query
     * @function
     */
    parse: function(query) {
        return query;
    }
});

/** @module sql */

SqlDbConn.Collection = Collection;

module.exports = SqlDbConn;
