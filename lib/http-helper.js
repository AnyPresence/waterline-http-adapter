'use strict';

var mappers = require('./mappers'),
    URI = require('URIjs'),
    util = require('util'),
    request = require('request'),
    _ = require('lodash'),
    handlebars = require('handlebars');

var mimes = {
    'json': 'application/json',
    'xml': 'application/xml',
    'form-encoded': 'application/x-www-form-urlencoded'
};

var maps = {
    'json': mappers.JsonMapper,
    'xml': mappers.XmlMapper
};

function HttpHelper(connection, model, action, urlParams, values, context) {
    var queryParams = (function() {
        if (context.query && context.query.query && context.query.scope) return context.query.query;
        return {};
    })();

    function mapQueryParams() {
        var q = {}, 
            map = action.mapping.request,
            keys = _.keys(queryParams);

        if (keys.length === 0) return q;

        keys.forEach(function(key) {
            q[map[key] || key] = queryParams[key];
        });

        return q;
    }

    return {
        interpolate: function(source) {
            if (!source) return '';
            if (!_.isString(source)) source = source.toString();
            if (source.indexOf('{{') === -1) return source;

            var template = handlebars.compile(source);
            return template(context);
        },
        mapResponse: function(payload, cb) {
            var mapper = maps[action.format](model, action, context);
            mapper.mapResponse(payload, cb);
        },
        mapRequest: function(cb) {
            var mapper = maps[action.format](model, action, context);
            mapper.mapRequest(values, cb);
        },
        constructUri: function() {
            var self = this;
            var url = new URI(connection.baseUri);
            var actionPath = action.path;

            if (url._parts.path.length > 0 && url._parts.path !== '/') {
              actionPath = url._parts.path + actionPath;
            }

            url.path(self.interpolate(actionPath));

            var allParams;

            allParams = _.merge(_.cloneDeep(connection.urlParameters),
                                _.cloneDeep(action.urlParameters) || {}, 
                                _.cloneDeep(urlParams) || {},
                                mapQueryParams());

            _.keys(allParams).forEach(function(key) {
                allParams[key] = self.interpolate(allParams[key]);
            });

            if (!_.isEmpty(allParams)) url.addQuery(allParams);

            return url.toString();
        },
        constructHeaders: function() {
            var self = this;
            
            var headers = {};

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

            //Merge all headers, action headers take precedence over adapter/connection headers
            headers = _.merge(headers, _.cloneDeep(connection.headers), _.cloneDeep(action.headers));


            _.keys(headers).forEach(function(key) {
                headers[key] = self.interpolate(headers[key]);
            });

            return headers;
        },
        constructBody: function(cb) {
            var self = this;
            
            // If action has a body template, construct and return it.
            if (action.bodyPayloadTemplate && !_.isEmpty(action.bodyPayloadTemplate)) {
                return cb(null, self.interpolate(action.bodyPayloadTemplate));
            }

            // If we have no body template result and the values supplied are empty,
            // return nothing.
            if (_.isEmpty(values)) return cb();
            
            self.mapRequest(function(err, res) {
                if (err) return cb(err);

                if (action.format === 'json') return cb(null, JSON.stringify(res));
                return cb(null, res);
            });
        },
        makeRequest: function(cb) {
            var self = this;
            
            self.constructBody(function(err, res) {
                if (err) return cb(err);

                var params = {
                    url: self.constructUri(),
                    headers: self.constructHeaders(),
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

                    if (response.statusCode >= 200 && response.statusCode < 300) {
                        if (action.pathSelector === '') {
                            sails.log.debug('Object ' + action.objectNameMapping + 'has no response selector configured for ' +
                                action.verb + ':' + action.path + '. Ignoring response body.');
                            return cb(null, response, []);
                        }

                        self.mapResponse(result, function(err, mappedResult) {
                            return cb(err, response, mappedResult);
                        });
                    } else {
                        var e = {
                            message: 'Remote host returned ' + response.statusCode,
                            adapter: connection.adapter,
                            responseBody: response.body
                        };
                        return cb(e);
                    }
                });
            });
        }
    };
}

module.exports = HttpHelper;