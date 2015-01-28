'use strict';

var URI = require('URIjs'),
    util = require('util'),
    request = require('request'),
    _ = require('lodash'),
    jsonPath = require('JSONPath'),
    select = require('xpath.js'),
    DomParser = require('xmldom').DOMParser,
    handlebars = require('handlebars');

var mimes = {
    'json': 'application/json',
    'xml': 'application/xml',
    'form-encoded': 'application/x-www-form-urlencoded'
};

function JsonMapper(model, action) {
    var attributes = model.attributes;
    var mapping = action.mapping;

    function _map(obj, cb) {
        var newModel = {};
        _.keys(attributes).forEach(function(key) {
            // Exclude instance methods added by the user.
            if (_.isFunction(attributes[key])) return;

            if (_.has(mapping, key)) {
                var val = jsonPath.eval(obj, mapping[key])[0];

                return newModel[key] = val;
            }
            // If no mapping for a key is found, attempt to get the value from
            // the payload object under the same key.
            newModel[key] = obj[key];
        });

        return cb(null, newModel);
    }

    return {
        map: function(payload, cb) {

            if (_.isString(payload)) {
                if (payload.trim() === '') return cb(null, []);
                try {
                    payload = JSON.parse(payload);
                } catch (e) {
                    return cb(e);
                }
            }

            var nodes = jsonPath.eval(payload, action.pathSelector);

            if (!nodes) return cb(new Error('Could not find any valid models in returned payload. Please check your selector. Payload: ' + payload));

            var values = [];

            nodes.forEach(function(obj) {
                
                _map(obj, function(err, result) {
                    if (err) return cb(err);

                    values.push(result);
                });
            });

            return cb(null, values);
        }
    };
}

function XmlMapper(model, action) {
    var attributes = model.attributes;
    var mapping = action.mapping;

    function _map(doc, cb) {
        var newModel = {};
        _.keys(attributes).forEach(function(key) {
            if (_.isFunction(attributes[key])) return;

            var map = mapping[key] || key + '/text()';

            var isXpath = (map.indexOf('/') !== -1 ||
                           map.indexOf('//') !== -1 ||
                           map.indexOf('.') !== -1 ||
                           map.indexOf('..') !== -1 ||
                           map.indexOf('@') !== -1);

            var selector = isXpath ? map : map + '/text()';
            var val = select(doc, selector).toString();

            return newModel[key] = val;
        });
        cb(null, newModel);
    }

    return {
        map: function(payload, cb) {
            var doc = new DomParser().parseFromString(payload);
            var nodes = select(doc, action.pathSelector);

            var values = [];

            nodes.forEach(function(node) {
                _map(node, function(err, result) {
                    if (err) return cb(err);

                    values.push(result);
                });
            });
            cb(null, values);
        }
    };
}

module.exports = {
    interpolate: function(source, context) {
        if (!source) return '';
        if (source.indexOf('{{') === -1) return source;

        var template = handlebars.compile(source);
        return template(context);
    },
    mapFields: function(payload, model, action, cb) {
        var mapper;

        var mappers = {
            'json': new JsonMapper(model, action),
            'xml': new XmlMapper(model, action)
        };

        mapper = mappers[action.format];

        mapper.map(payload, cb);
    },
    constructUri: function(connection, action, urlParams, context) {
        var self = this;
        var url = new URI(connection.baseUri);
        var actionPath = action.path;

        if (url._parts.path.length > 0 && url._parts.path !== '/') {
          actionPath = url._parts.path + actionPath;
        }

        url.path(self.interpolate(actionPath, context));

        var allParams;

        allParams = _.merge(connection.urlParameters, 
                            action.urlParameters || {}, 
                            urlParams || {});

        _.keys(allParams).forEach(function(key) {
            allParams[key] = self.interpolate(allParams[key], context);
        });

        if (!_.isEmpty(allParams)) url.addQuery(allParams);

        return url.toString();
    },
    constructHeaders: function(connection, action, context) {
        var self = this;
        //Merge all headers, action headers take precedence over adapter/connection headers
        var headers = _.merge(connection.headers, action.headers);

        _.keys(headers).forEach(function(key) {
            headers[key] = self.interpolate(headers[key], context);
        });

        /* Content negotiation headers
           The action configuration takes precedence over the adapter configuration,
           except when the action is form-encoded. When an outoing request is set
           to form-encoded, it falls back to the adapter level configuration
           for the Accept header.

           If the action doesn't have a format defined, fallback to the adapter
           connection format.
        */
        headers['Content-Type'] = headers['Accept'] = mimes[action.format || connection.format];
        if (action.format === 'form-encoded') headers['Accept'] = mimes[connection.format];

        // Basic auth header construction
        if (connection.username && connection.passwordPlainText) {
            var buffer = new Buffer(connection.username + ':' + connection.passwordPlainText);
            headers['Authorization'] = 'Basic ' + buffer.toString('base64');
        }

        return headers;
    },
    constructBody: function(action, values, context) {
        var self = this;
        var result;

        // If action has a body template, construct and return it.
        if (action.bodyPayloadTemplate && !_.isEmpty(action.bodyPayloadTemplate)) {
            result = self.interpolate(action.bodyPayloadTemplate, context);
        }

        // If we have no body template result and the values supplied are empty,
        // return nothing.
        if (_.isEmpty(result) && _.isEmpty(values)) return;
        
        if (action.format === 'json') {
            result = JSON.stringify(values);
        }
        return result;
    },
    makeRequest: function(connection, model, action, urlParams, values, context, cb) {
        var self = this;

        var params = {
            url: self.constructUri(connection, action, urlParams, context),
            headers: self.constructHeaders(connection, action, context),
            method: action.verb,
            body: self.constructBody(action, values, context) || ''
        };

        sails.log.debug('request made with options: ' + util.inspect({
            params:params,
            configuration: action
        }));

        // TODO: If we want to implement request lifecycle callbacks we may have to
        // remove the request library and make them manually, so we can expose the request
        // and response.
        request(params, function(err, response, result) {
            if (err) return cb(err);

            self.mapFields(result, model, action, function(err, mappedResult) {
                return cb(err, response, mappedResult);
            });
        });
    }
};