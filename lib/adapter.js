'use strict';

var helper = require('./http-helper'),
    util = require('util'),
    _ = require('lodash');

module.exports = (function () {
  var connections = {};
  var _collections = {};

  var adapter = {
    syncable: false,

    defaults: {},

    registerConnection: function(connection, collections, cb) {
      if(!connection.identity) return cb(new Error('Connection is missing an identity.'));
      if(connections[connection.identity]) return cb(new Error('Connection is already registered.'));

      _.keys(collections).forEach(function(key) {
        _collections[key] = collections[key];
      });

      connections[connection.identity] = connection;
      cb();
    },

    teardown: function (conn, cb) {
      cb();
    },

    // Raw request method
    //  * action is the route method name in the model such as read, update or delete ( or really anything at all )
    //  * context is the object that contains all interpolation values, currentUser, currentObject and session information
    //  * options contain any additional headers or parameters not in configuration and determined at runtime,
    //    such as limit, offset, etc. It can also contain a post body object or string.
    //  * cb is the final callback
    request: function(identity, collection, actionName, options, values, context, cb) {
      var connection = connections[identity];
      var model = _collections[collection];
      var action = model.httpAdapter[actionName];

      if(!action) return cb(new Error(util.format('No HTTP adapter action "%s" configuration for model "%s".', actionName, model.identity)));

      helper.makeRequest(connection, model, action, options, values, context, function(err, response, result) {
        if (err) return cb(err);

        // Create model instances from the POJOs.
        var models = [];
        result.forEach(function(attributes) {
          models.push(new model._model(attributes, {}));
        });
        cb(null, models);
      });
    },

    identity: 'waterline-http'
  };


  return adapter;
})();