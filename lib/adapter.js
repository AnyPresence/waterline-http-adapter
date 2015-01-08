'use strict';

var helper = require('./http-helper'),
    util = require('util'),
    _ = require('lodash'),
    inflection = require('inflection'),
    Promise = require('bluebird');


function executeCallbacks(model, lifecycle, actionName, options, cb) {
  var methodName = lifecycle + inflection.capitalize(actionName);
  if(_.isFunction(model[methodName])) {
    model[methodName](options, function() {
      cb();
    });
  } else {
    cb();
  }
}

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

    helper: helper,
    // findRequest: function(identity, collection, urlParams, context, cb) {
    //   return this.request(identity, collection, 'find', urlParams, {}, context, cb);
    // },
    // createRequest: function(identity, collection, values, context, cb) {
    //   return this.request(identity, collection, 'create', {}, values, context, cb);
    // },
    // updateRequest: function(identity, collection, urlParams, values, context, cb) {
    //   return this.request(identity, collection, urlParams, values, context, cb);
    // },
    // destroyRequest: function(identity, collection, urlParams, values, context, cb) {

    // },

    // Raw request method - supports promises or typical node callback i.e. function(err, result)
    //  * actionName is the route method name in the model such as read, update or delete ( or really anything at all )
    //  * urlParams contain any additional URL parameters supplied in the controller. Currently, only limit and offset are supplied
    //    with the urlParams param, but custom code expand on that. These can also be interpolated at runtime.
    //  * values are any objects to be created, such as the body of a post to create.
    //  * context is the object that contains all interpolation values, currentUser, currentObject and session information
    //  * cb is the final callback
    request: function(identity, collection, actionName, urlParams, values, context, cb) {
      return new Promise(function(resolve, reject) {
        var connection = connections[identity];
        var model = _collections[collection];
        // Clone action config so any changes made by user in callbacks doesn't affect
        // future calls.
        var action = _.cloneDeep(model.http[actionName]);

        if(!action) return reject(new Error(util.format('No HTTP adapter action "%s" configuration for model "%s".', actionName, model.identity)));

        var callbackOpts = {
          action: action,
          urlParams: urlParams,
          values: values,
          context: context
        };

        executeCallbacks(model, 'before', actionName, callbackOpts, function() {
          helper.makeRequest(connection, model, action, urlParams, values, context, function(err, response, result) {
            if (err) return reject(err);

            // Create model instances from the POJOs.
            var models = [];
            result.forEach(function(attributes) {
              models.push(new model._model(attributes, {}));
            });

            callbackOpts.response = response;
            callbackOpts.models = models;

            executeCallbacks(model, 'after', actionName, callbackOpts, function() {
              return resolve(models);
            });
          });
        });
      }).nodeify(cb);
    },

    identity: 'waterline-http'
  };

  return adapter;
})();