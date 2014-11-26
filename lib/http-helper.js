var URI = require('URIjs'),
    request = require('request'),
    util = require('util'),
    _ = require('lodash');

module.exports = {
    constructUri: function(connection, options, context) {
        var url = new URI(connection.baseUri);
        url.path(options.path);

        // Only append query parameters if they're supplied to the adapter configuration.
        // URIjs will bark if it's given an empty object.
        if (!_.isEmpty(connection.urlParameters)) url.addQuery(connection.urlParameters);

        //TODO Interpolate entire url string before returning, that should make it
        //  easy to get both url and the supplied parameters interpolated at the same time.
        return url.toString();
    },
    makeRequest: function(connection, model, method, context, cb) {
        var options = model.httpAdapter[method];
        if(!options) return cb(new Error(util.format('No HTTP adapter configuration found for "%s" for this object.', method)));

        //Merge all headers, method options take precedence over connection headers
        var headers = _.merge(connection.headers, options.headers);

        //TODO Iterate headers and interpolate values.

        var reqOptions = {
            url: this.constructUri(connection, options, context),
            method: options.verb,
            headers: headers
        };

        request(reqOptions, cb);
    }
};