'use strict';

var DOMParser = require('xmldom').DOMParser,
    _ = require('lodash');

function ParseError(payload, format, cause, message) {
  this.name = 'ParseError';
  this.payload = payload;
  this.format = format;
  this.cause = cause;
  this.message = message || 'A parse error was encountered attempting to parse ' + format;
}

ParseError.prototype = Error.prototype;
ParseError.prototype.constructor = ParseError;

function JsonParser() {
  
  return {
    parse: function(payload) {
      if (_.isString(payload)) {
        if (payload.trim() === '') return null;
        
        var obj = null;
        try {
          return JSON.parse(payload);
        } catch(e) {
          throw new ParseError(payload, 'json', e);
        }
      } else if (_.isObject(payload)) {
        // be kind and just return the object since it is apparently already parsed
        return payload;
      } else {
        throw new ParseError(payload, 'json', e, "Unable to parse payload since it is not a string");
      }
    }
  };
  
}

// custom error handler - be a bit more strict than the default error handler, which is a little
// too forgiving for our purposes
var xmlErrorHandler = {
  warn: function(errorMessage) {
    sails.log.debug("Encountered warning parsing XML: " + errorMessage);
  },
  error: function(errorMessage) {
    throw errorMessage;
  },
  fatalError: function(errorMessage) {
    throw errorMessage;
  }
};

function XmlParser() {
  
  return {
    parse: function(payload) {
      var doc = null;
    
      try {
        var parser = new DOMParser({ errorHandler: xmlErrorHandler });
        var doc = parser.parseFromString(payload, 'text/xml');
        if (!doc.documentElement) {
          throw new ParseError(payload, 'xml', null, 'Unable to parse xml: root document element could not be found');
        }
        return doc;
      } catch(e) {
        throw new ParseError(payload, 'xml', e);
      }
    }
  };
  
}

module.exports = {
  JsonParser: JsonParser,
  XmlParser: XmlParser,
  ParseError: ParseError
}