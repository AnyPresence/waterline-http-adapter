'use strict';

var URI = require('URIjs'),
    request = require('request'),
    _ = require('lodash'),
    jsonPath = require('JSONPath'),
    select = require('xpath.js'),
    DomParser = require('xmldom').DOMParser;

var mimes = {
    'json': 'application/json',
    'xml': 'application/xml',
    'form-encoded': 'application/x-www-form-urlencoded'
};

function JsonMapper(model, action) {
    var attributes = model.attributes;
    var mapping = action.mapping;

    function map(obj, cb) {
        var newModel = {};
        _.keys(attributes).forEach(function(key) {
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
            if (_.isArray(payload)) {
                var values = [];

                payload.forEach(function(obj) {
                    
                    map(obj, function(err, result) {
                        if (err) return cb(err);

                        values.push(result);

                        if (values.length === payload.length) return cb(null, values);
                    });
                });
            } else {
                map(payload, function(err, values) {
                    return cb(err, values);
                });
            }
        }
    };
}

function XmlMapper(model, action) {
    var attributes = model.attributes;
    var mapping = action.mapping;

    function getCollectionTag(doc, cb) {
        var root = select(doc, '/*')[0];

        var keyMap = [];
        _.keys(root.childNodes).forEach(function(key) {
            // xmldom includes a length key, ignore it.
            if (key === 'length') return;

            var nodeKey = root.childNodes[key].tagName;

            if (_.contains(keyMap, nodeKey)) return;

            keyMap.push(nodeKey);
        });

        if (_.size(keyMap) === 1) return cb(null, keyMap[0]);
        return cb(new Error('Could not find a singlular node key for collection, found: ' + keyMap));
    }

    function isCollection() {
        if (action.isCollection && action.isCollection === true) return true;
        //TODO: Check if we're dealing with a scope. Scopes are plural regardless.
        return false;
    }

    function map(doc, cb) {
        var newModel = {};
        _.keys(attributes).forEach(function(key) {
            var val, p;
            if (_.has(mapping, key)) {
                p = mapping[key];
            } else {
                if (isCollection()) {
                    p = key + '/text()';
                } else {
                    p = '//' + key + '/text()';
                }
            }

            val = select(doc, p).toString();

            return newModel[key] = val;
        });
        cb(null, newModel);
    }

    return {
        map: function(payload, cb) {
            var doc = new DomParser().parseFromString(payload);
            if (isCollection()) {

                getCollectionTag(doc, function(err, tag) {
                    if (err) cb(err);

                    var nodes = select(doc, '//'+ tag);

                    var values = [];

                    nodes.forEach(function(node) {
                        // values.push(map(node, true));
                        map(node, function(err, result) {
                            if (err) return cb(err);

                            values.push(result);

                            if (values.length === nodes.length) return cb(null, values);
                        });
                    });
                });
            } else {
                map(doc, function(err, value) {
                    return cb(err, value);
                });
            }
        }
    };
}

module.exports = {
    mapFields: function(payload, model, action, cb) {
        var mapper;

        if(action.format === 'json') {
            mapper = new JsonMapper(model, action);
        } else {
            mapper = new XmlMapper(model, action);
        }

        mapper.map(payload, function(err, values) { 
            cb(err, values);
        });
    },
    constructUri: function(connection, action, options) {
        var url = new URI(connection.baseUri);
        url.path(action.path);

        var urlParams;

        // If the action is not POST, PATCH or PUT then options is encoded into
        // the url.
        if (!_.contains(['post', 'patch', 'put'], action.verb.toLowerCase())) {
            // merging connection options first and overwriting with subsequent
            // sources.
            urlParams = _.merge(connection.urlParameters, 
                                action.urlParameters || {}, 
                                options || {});
        } else {
            // The only parameters send on the post, path or put are the adapter
            // level params
            urlParams = connection.urlParameters;
        }

        if (!_.isEmpty(urlParams)) url.addQuery(connection.urlParameters);

        return url.toString();
    },
    constructHeaders: function(connection, action) {
        //Merge all headers, action headers take precedence over adapter/connection headers
        var headers = _.merge(connection.headers, action.headers);

        /* Content negotiation headers
           The action configuration takes precedence over the adapter configuration,
           except when the action is form-encoded. When an outoing request is set
           to form-encoded, it falls back to the adapter level configuration
           for the Accepts header.

           If the action doesn't have a format defined, fallback to the adapter
           connection format.
        */
        headers['Content-Type'] = headers['Accepts'] = mimes[action.format || connection.format];
        if (action.format === 'form-encoded') headers['Accepts'] = mimes[connection.format];

        // Basic auth header construction
        if (connection.username && connection.passwordPlainText) {
            var buffer = new Buffer(connection.username + ':' + connection.passwordPlainText);
            headers['Authorization'] = 'Basic ' + buffer.toString('base64');
        }

        return headers;
    },
    constructBody: function(connection, action, payload) {
        //TODO: Handle body templates.
        return payload || '';
    },
    makeRequest: function(connection, model, action, options, values, cb) {
        var self = this;

        var params = {
            url: this.constructUri(connection, action, options),
            headers: this.constructHeaders(connection, action),
            method: action.verb,
            body: this.constructBody(connection, action)
        };

        request(params, function(err, response, result) {
            if (err) return cb(err);

            self.mapFields(result, model, action, function(err, mappedResult) {
                return cb(err, response, mappedResult);
            });
        });
    }
};