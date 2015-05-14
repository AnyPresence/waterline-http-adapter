var assert = require('chai').assert,
    parsers = require('../../lib/parsers');

describe('Parsers', function() {
  describe('JSON prototype function', function() {
    it('should exist', function() {
      assert.isDefined(parsers.JsonParser);
    });

    it('should be a function', function() {
      assert.isFunction(parsers.JsonParser);
    });

    it('should return a JsonParser object', function() {
      var parser = parsers.JsonParser();
      assert.isObject(parser);
    });

    it('should have a parse method', function() {
      var parser = parsers.JsonParser();
      assert.isFunction(parser.parse);
    });

    it ('should correctly parse JSON', function() {
      var parser = parsers.JsonParser();
      var obj = parser.parse('{ "aaa": "bbb" }');
      assert.equal(obj.aaa, 'bbb');
    });

    it('should throw a ParseError when parsing invalid JSON', function() {
      var parser = parsers.JsonParser();
      assert.throws(function() { var obj = parser.parse('{ "aaa": "bbb" '); }, parsers.ParseError);
    });
  });

  describe('XML prototype function', function() {
    it('should exist', function() {
      assert.isDefined(parsers.XmlParser);
    });

    it('should be a function', function() {
      assert.isFunction(parsers.XmlParser);
    });

    it('should return a XmlParser object', function() {
      var parser = parsers.XmlParser();
      assert.isObject(parser);
    });

    it('should have a parse method', function() {
      var parser = parsers.XmlParser();
      assert.isFunction(parser.parse);
    });

    it('should correctly parse XML', function() {
      var parser = parsers.XmlParser();
      var doc = parser.parse('<xml></xml>');
      assert.isObject(doc);
    });

    it('should throw a ParseError when parsing invalid XML', function() {
      var parser = parsers.XmlParser();
      assert.throws(function() { parser.parse("{json: 'is not XML'}"); }, parsers.ParseError);
      assert.throws(function() { parser.parse("text is not xml either"); }, parsers.ParseError);
    });
  });

  describe('ParseError prototype', function() {
    it('should exist', function() {
      assert.isDefined(parsers.ParseError);
    });

    it('should be a function', function() {
      assert.isFunction(parsers.ParseError);
    });

    it('should inherit from Error', function() {
      var error = new parsers.ParseError('xxx', 'xxx');
      assert.instanceOf(error, Error);
      assert.instanceOf(error, parsers.ParseError);
    });

    it('should properly set constructor', function() {
      var error = new parsers.ParseError('xxx', 'xxx');
      assert(error.constructor === parsers.ParseError);
    });
  });
});