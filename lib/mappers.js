'use strict';

var jsonPath    = require('JSONPath'),
    select      = require('xpath.js'),
    util        = require('util'),
    _           = require('lodash');

function JsonMapper(model, action, context) {
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
                newModel[key] = val;
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
            var mappedKey = map[key];
            if (mappedKey) newModel[mappedKey] = obj[key];
        });

        // Supply ID to the model if none is present and we can find one in
        // the params. Only applies to PUT and POST verbs.
        if (!newModel['id'] && context.params && context.params.id && _.contains(['PUT', 'POST'], action.verb)) {
            var idType = attributes['id']['type'];
            // not sure why you'd need to support anything other than text and integer (anything else for a key would seem like an odd use case),
            // but let's support it anyway for sake of being thorough ....
            if (idType === 'integer' || idType === 'float') {
                newModel['id'] = Number(context.params.id);
            } else if (idType === 'text') {
                newModel['id'] = context.params.id;
            } else if (idType === 'date' || idType === 'datetime') {
                newModel['id'] = new Date(context.params.id).toJSON();
            } else if (idType === 'boolean') {
                newModel['id'] = context.params.id === 'true';
            } else {
                cb(new Error("id field of type " + idType + " is not supported!"));
            }
            
        }

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
            var nodes;
            if (action.pathSelector === '$') {
                nodes = [payload];
            } else {
                nodes = jsonPath.eval(payload, action.pathSelector);
            }
            
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

function XmlMapper(model, action, context) {
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

            newModel[key] = val;
        });
        cb(null, newModel);
    }

    function _mapRequest(objs, isCollection, cb) {
        var root = action.objectNameMapping;

        var payload = isCollection ? '<collection>' : '';

        objs.forEach(function(obj) {
            payload += '<' + root + '>';
            var keys = _.keys(obj);

            if (!_.contains(keys, 'id') && context.params && context.params.id && _.contains(['POST', 'PUT'], action.verb)) {
                payload += '<id>' + context.params.id + '<id>';
            }

            keys.forEach(function(key) {
                if (_.isFunction(attributes[key])) return;

                var tag = mapping.request[key];

                if (tag) payload += '<' + tag + '>' + obj[key] + '</' + tag + '>';
            });
            payload += '</' + root + '>';            
        });

        if (isCollection) payload += '</collection>';
        cb(null, payload);
    }

    // Public interface for XmlMapper
    return {
        mapResponse: function(doc, cb) {
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

// Public interface
module.exports = {
    JsonMapper: JsonMapper,
    XmlMapper: XmlMapper
};