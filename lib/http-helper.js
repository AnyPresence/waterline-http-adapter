'use strict';

var URI = require('URIjs'),
    request = require('request'),
    _ = require('lodash'),
    jsonPath = require('JSONPath'),
    xpath = require('xpath'),
    DomParser = require('xmldom').DOMParser;

var mimes = {
    'json': 'application/json',
    'xml': 'application/xml',
    'form-encoded': 'application/x-www-form-urlencoded'
};

function JsonMapper(model, action) {
    var attributes = model.attributes;
    var mapping = action.mapping;

    function map(obj) {
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
        return newModel;
    }

    return {
        map: function(payload) {
            if (_.isArray(payload)) {
                var mappedObjects = [];

                payload.forEach(function(obj) {
                    mappedObjects.push(map(obj));
                });

                return mappedObjects;
            }
            return map(payload);
        }
    };
}

function XmlMapper(model, action) {
    var attributes = model.attributes;
    var mapping = action.mapping;

    function map(doc) {
        var newModel = {};
        _.keys(attributes).forEach(function(key) {
            if (_.has(mapping, key)) {
                var val = xpath.select(mapping[key], doc);
                return newModel[key] = val;
            }
        });
        return newModel;
    }

    return {
        map: function(payload) {
            var doc = new DomParser().parseFromString(payload);
            return map(doc);

        }
    };
}

module.exports = { 
    mapFields: function(payload, model, action) {
        var mapper;

        if(action.format === 'json') {
            mapper = new JsonMapper(model, action);
        } else {
            mapper = new XmlMapper(model, action);
        }

        return mapper.map(payload);
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
            method: action.verb
        };

        request(params, function(err, response, result) {
            if (err) return cb(err);

            var mappedResult = self.mapFields(result, model, action);
            return cb(err, response, mappedResult);
        });
    }
};