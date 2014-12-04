var URI = require('URIjs'),
    request = require('request'),
    util = require('util'),
    _ = require('lodash');

var mimes = {
    'json': 'application/json',
    'xml': 'application/xml',
    'form-encoded': 'application/x-www-form-urlencoded'
};

module.exports = {
    mapFields: function(original, action) {
        return null;
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
    makeRequest: function(connection, model, method, options, values, cb) {
        var self = this;
        var action = model.httpAdapter[method];
        if(!action) return cb(new Error(util.format('No HTTP adapter action "%s" configuration for model "%s".', method, model.identity)));

        var params = {
            url: this.constructUri(connection, action, options),
            headers: this.constructHeaders(connection, action),
            method: action.verb
        };

        request(params, function(err, response, result) {
            if (err) return cb(err);

            var mappedResult = self.mapFields(result, action);
            return cb(err, response, mappedResult);
        });
    }
};