/**
 * Test dependencies
 */
var Adapter = require('../../'),
    assert = require('chai').assert,
    connections = require('../stubs/connections');

var waterline, Model;

before(function(done) {
    var fn = require('../bootstrap-waterline');
    var collections = {
        "basic-model": require('../stubs/basic-model')
    };
    waterline = fn(connections, collections, function(err, ontology) {
        Model = ontology.collections['basic-model'];
        done(err);
    });
});

describe('Waterline configuration', function() {
    it('should get the connection stub', function() {
        assert.isObject(connections);
    });

    it('should get the basic-model stub', function() {
        assert.isObject(Model);
    });

    it('should bootstrap waterline for testing', function() {
        assert.isObject(waterline);
    });
});

describe('Adapter', function() {
    it('should export correctly for testing', function() {
        assert.isObject(Adapter);
    });

    describe('interface', function() {
        it('should implement the registerConnection function', function() {
            assert.isFunction(Adapter.registerConnection);
        });

        it('should implement the teardown function', function() {
            assert.isFunction(Adapter.teardown);
        });

        it('should implement a find function', function() {
            assert.isFunction(Adapter.find);
        });

        it('should implement a create function', function() {
            assert.isFunction(Adapter.create);
        });

        it('should implement an update function', function() {
            assert.isFunction(Adapter.update);
        });

        it('should implement a destroy function', function() {
            assert.isFunction(Adapter.destroy);
        });

        it('should implement an identity property', function() {
            assert(Adapter.identity === 'waterline-http');
        });
    });
});

describe('basic-model', function() {
    it('should implement the find method defined in the adapter', function(done) {
        Model.find(done);
    });
})