var path = require('path'),
    helper = require('./http-helper');

module.exports = (function () {
  var connections = {};

  var adapter = {
    syncable: false,

    defaults: {},

    registerConnection: function(connection, collections, cb) {
      if(!connection.identity) return cb(new Error('Connection is missing an identity.'));
      if(connections[connection.identity]) return cb(new Error('Connection is already registered.'));

      connections[connection.identity] = connection;
      cb();
    },

    teardown: function (conn, cb) {
      cb();
    },

    find: function(identity, collection, options, cb) {
      return this.request(identity, collection, 'find', options, {}, cb);
    },

    create: function(identity, collection, values, cb) {
      return this.request(identity, collection, 'create', {}, values, cb);
    },

    update: function(identity, collection, options, values, cb) {
      return this.request(identity, collection, 'update', options, values, cb);
    },

    destroy: function(identity, collection, options, values, cb) {
      return this.request(identity, collection, 'destroy', options, values, cb);
    },

    // identity and collection are supplied by waterline
    //  * action is the route method name in the model such as read, update or delete ( or really anything at all )
    //  * context is the object that contains all interpolation values, currentUser, currentObject and session information
    //  * options contain any additional headers or parameters not in configuration and determined at runtime,
    //    such as limit, offset, etc. It can also contain a post body object or string.
    //  * cb is the final callback
    request: function(identity, collection, action, options, values, cb) {
      this.emit('test', {value: 'test'});
      var connection = connections[identity];
      var model = require(path.join(process.env.MODEL_DIRECTORY, connection.modelMap[collection]));

      cb();
    },

    identity: 'waterline-http'
  };


  return adapter;
})();