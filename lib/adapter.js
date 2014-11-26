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

    //TODO Possibly make proxy calls to request from find, create, etc calls instead
    // of removing them altogether. Although, waterline will create the helper methods
    // like findOne that will most definitely blow up...

    request: function(identity, collection, methodName, context, cb) {
      var connection = connections[identity];
      var model = require(path.join(process.env.MODEL_DIRECTORY, connection.modelMap[collection]));
      cb();
    },

    identity: 'waterline-http'
  };

  return adapter;
})();