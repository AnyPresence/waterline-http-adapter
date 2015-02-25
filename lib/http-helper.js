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

var mappers = {
    'json': function(model, action) {
                return new JsonMapper(model, action);
            },
    'xml': function(model, action) {
                return new XmlMapper(model, action);
            }
};


function JsonMapper(model, action) {
    var attributes = model.attributes;
    var mapping = action.mapping;

    function _mapResponse(obj, cb) {
        var newModel = {};
        var map = mapping.response;
        _.keys(attributes).forEach(function(key) {
            // Exclude instance methods added by the user.
            if (_.isFunction(attributes[key])) return;

            if (_.has(map, key)) {
                var val = jsonPath.eval(obj, map[key])[0];

                return newModel[key] = val;
            } else {
                // If no mapping for a key is found, attempt to get the value from
                // the payload object under the same key.
                newModel[key] = obj[key];
            }
        });

        return cb(null, newModel);
    }

    function _mapRequest(obj, cb) {
        var newModel = {};
        var map = mapping.request;
        _.keys(obj).forEach(function(key) {
            newModel[map[key] || key] = obj[key];
        });

        return cb(null, newModel);
    }

    function mapAllNodes(nodes, mapFn, cb) {
        var values = [];
        nodes.forEach(function(node) {
            mapFn(node, function(err, result) {
                if (err) return cb(err);

                values.push(result);
            });
        });

        return cb(null, values);
    }

    // Public interface for JsonMapper
    return {
        mapResponse: function(payload, cb) {
            if (_.isString(payload)) {
                if (payload.trim() === '') return cb(null, []);
                try {
                    payload = JSON.parse(payload);
                } catch (e) {
                    return cb(e);
                }
            }

            var nodes = jsonPath.eval(payload, action.pathSelector);

            if (!nodes) return cb(new Error('Could not find any valid models in returned payload. Please check your selector. Payload: ' + util.inspect(payload)));

            mapAllNodes(nodes, _mapResponse, function(err, result) {
                if (err) return cb(err);

                return cb(null, result);
            });
        },
        mapRequest: function(payload, cb) {
            var nodes = payload;
            var isCollection = true;

            if (!_.isArray(nodes)) {
                nodes = [nodes];
                isCollection = false;
            }

            mapAllNodes(nodes, _mapRequest, function(err, result) {
                if (err) return cb(err);

                if (isCollection) return cb(null, result);
                return cb(null, result[0]);
            });
        }
    };
}

function XmlMapper(model, action) {
    var attributes = model.attributes;
    var mapping = action.mapping;

    function _mapResponse(doc, cb) {
        var newModel = {};
        _.keys(attributes).forEach(function(key) {
            if (_.isFunction(attributes[key])) return;

            var map = mapping.response[key] || key + '/text()';

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

    function _mapRequest(objs, isCollection, cb) {
        var root = action.objectNameMapping;

        var payload = isCollection ? '<collection>' : '';

        objs.forEach(function(obj) {
            payload += '<' + root + '>';
            _.keys(obj).forEach(function(key) {
                if (_.isFunction(attributes[key])) return;

                var tag = mapping.request[key] ? mapping.request[key] : key;

                payload += '<' + tag + '>' + obj[key] + '</' + tag + '>';
            });
            payload += '</' + root + '>';            
        });

        if (isCollection) payload += '</collection>';
        cb(null, payload);
    }

    // Public interface for XmlMapper
    return {
        mapResponse: function(payload, cb) {
            var doc = new DomParser().parseFromString(payload);
            var nodes = select(doc, action.pathSelector);

            var values = [];

            nodes.forEach(function(node) {
                _mapResponse(node, function(err, result) {
                    if (err) return cb(err);

                    values.push(result);
                });
            });
            cb(null, values);
        },
        mapRequest: function(obj, cb) {
            var isCollection = true;
            if (!_.isArray(obj)) {
                obj = [obj];
                isCollection = false;
            }

            _mapRequest(obj, isCollection, cb);
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
    mapResponse: function(payload, model, action, cb) {
        var mapper = mappers[action.format](model, action);
        mapper.mapResponse(payload, cb);
    },
    mapRequest: function(payload, model, action, cb) {
        var mapper = mappers[action.format](model, action);
        mapper.mapRequest(payload, cb);
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

        allParams = _.merge(_.cloneDeep(connection.urlParameters),
                            _.cloneDeep(action.urlParameters) || {}, 
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
        var headers = _.merge(_.cloneDeep(connection.headers), _.cloneDeep(action.headers));

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
    constructBody: function(action, values, model, context, cb) {
        var self = this;
        
        // If action has a body template, construct and return it.
        if (action.bodyPayloadTemplate && !_.isEmpty(action.bodyPayloadTemplate)) {
            return cb(null, self.interpolate(action.bodyPayloadTemplate, context));
        }

        // If we have no body template result and the values supplied are empty,
        // return nothing.
        if (_.isEmpty(values)) return cb();
        
        self.mapRequest(values, model, action, function(err, res) {
            if (err) return cb(err);

            if (action.format === 'json') return cb(null, JSON.stringify(res));
            return cb(null, res);
        });
    },
    makeRequest: function(connection, model, action, urlParams, values, context, cb) {
        var self = this;
        
        self.constructBody(action, values, model, context, function(err, res) {
            if (err) return cb(err);

            var params = {
                url: self.constructUri(connection, action, urlParams, context),
                headers: self.constructHeaders(connection, action, context),
                method: action.verb,
                body: res || ''
            };

            sails.log.debug('request made with options: ' + util.inspect(
                {
                    params:params,
                    configuration: action
                }
            ));

            request(params, function(err, response, result) {
                if (err) return cb(err);

                if (action.pathSelector === '') return cb(null, response, []);

                self.mapResponse(result, model, action, function(err, mappedResult) {
                    return cb(err, response, mappedResult);
                });
            });
        });
    }
};