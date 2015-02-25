var assert = require('chai').assert,
    mappers = require('../../lib/mappers');

describe('Mappers', function() {
    describe('XML prototype function', function() {
        it('should exist', function() {
            assert.isDefined(mappers.XmlMapper);
        });

        it('should be a function', function() {
            assert.isFunction(mappers.XmlMapper);
        });

        it('should return an XmlMapper object', function() {
            var mapper = mappers.XmlMapper({}, {}, {});
            assert.isObject(mapper);
        });

        it('should have a mapRequest and mapResponse method', function() {
            var mapper = mappers.XmlMapper({}, {}, {});
            assert.isFunction(mapper.mapRequest);
            assert.isFunction(mapper.mapResponse);
        });
    });

    describe('JSON prototype function', function() {
        it('should exist', function() {
            assert.isDefined(mappers.JsonMapper);
        });

        it('should be a function', function() {
            assert.isFunction(mappers.JsonMapper);
        });

        it('should return a JsonMapper object', function() {
            var mapper = mappers.JsonMapper({}, {}, {});
            assert.isObject(mapper);
        });

        it('should have a mapRequest and mapResponse method', function() {
            var mapper = mappers.JsonMapper({}, {}, {});
            assert.isFunction(mapper.mapRequest);
            assert.isFunction(mapper.mapResponse);
        });
    });
});