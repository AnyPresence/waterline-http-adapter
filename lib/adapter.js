module.exports = (function () {
  var connections = {};
  var collections = {};

  var adapter = {
    syncable: false,

    defaults: {

    },

    registerConnection: function(connection, collections, cb) {

      if(!connection.identity) return cb(new Error('Connection is missing an identity.'));
      if(connections[connection.identity]) return cb(new Error('Connection is already registered.'));

      connections[connection.identity] = connection;
      collections = collections;
      cb();
    },

    teardown: function (conn, cb) {
      // Nothing really needs to be freed when tearing down the http adapter
      // but I'll leave it in just in case something comes up.
      cb();
    },

    find: function (connection, collection, options, cb) {
      console.log(connection);
      console.log(collection);
      return cb();
    },

    create: function (connection, collection, values, cb) {
      return cb();
    },

    update: function (connection, collection, options, values, cb) {
      return cb();
    },

    destroy: function (connection, collection, options, values, cb) {
      return cb();
    },

    /*

    // Custom methods defined here will be available on all models
    // which are hooked up to this adapter:

    */

    // Apparently very important but not included in the boilerplate...
    identity: 'waterline-http'
  };

  // Expose adapter definition
  return adapter;

})();