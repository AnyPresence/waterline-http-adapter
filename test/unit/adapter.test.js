var adapter = require('../../'),
    assert = require('chai').assert,
    connections = require('../stubs/connections'),
    nock = require('nock');

var waterline, Model;

before(function(done) {
    var fn = require('../bootstrap-waterline');
    var collections = {
        "V1Model": require('../stubs/V1Model')
    };
    waterline = fn(connections, collections, function(err, ontology) {
        Model = ontology.collections['v1model'];
        done(err);
    });
});

describe('Adapter', function() {
    describe('Connection configuration', function() {
        it('should have the test object', function() {
            assert.isDefined(connections.test);
        });

        describe('Test connection', function() {
            var testConnection = connections.test;

            it('should have the adapter property', function() {
                assert.isDefined(testConnection.adapter);
            });

            it('should have the baseUri property', function() {
                assert.isDefined(testConnection.baseUri);
            });

            it('should have the loggingLevel property', function() {
                assert.isDefined(testConnection.loggingLevel);
            });

            it('should have the username property', function() {
                assert.isDefined(testConnection.username);
            });

            it('should have the passwordPlainText property', function() {
                assert.isDefined(testConnection.passwordPlainText);
            });

            it('should have the format property', function() {
                assert.isDefined(testConnection.format);
            });

            it('should have the headers property', function() {
                assert.isDefined(testConnection.headers);
            });

            it('should have the urlParameters property', function() {
                assert.isDefined(testConnection.urlParameters);
            });
        });
    });

    describe('Waterline configuration', function() {
        it('should get the connection stub', function() {
            assert.isObject(connections);
        });

        it('should get the V1Model stub', function() {
            assert.isObject(Model);
        });

        it('should bootstrap waterline for testing', function() {
            assert.isObject(waterline);
        });
    });

    describe('implementation', function() {
        it('should export correctly for testing', function() {
            assert.isObject(adapter);
        });

        describe('Interface', function() {
            it('should implement the registerConnection function', function() {
                assert.isFunction(adapter.registerConnection);
            });

            it('should implement the teardown function', function() {
                assert.isFunction(adapter.teardown);
            });

            it('should implement a request function', function() {
                assert.isFunction(adapter.request);
            });

            it('should implement an identity property', function() {
                assert(adapter.identity && adapter.identity === 'waterline-http');
            });
        });

        describe('request function', function() {
            it('should return an error if no options are found for supplied action', function(done) {
                adapter.request('test', 'v1model', 'notfound', {}, {}, {}, function(err) {
                    assert.isDefined(err);
                    done();
                });
            });

            it('should return an error on a non-2xx response', function(done) {
                nock('http://localhost:1337')
                    .get('/api/V1/model')
                    .reply(400);

                adapter.request('test', 'v1model', 'read', {}, {}, {}, function(err) {
                    assert.isDefined(err);
                    assert.equal(err.error.message, 'Remote host returned 400');
                    assert.equal(err.statusCode, 400);
                    done();
                });
            });

            it('should return an error on a 500 response', function(done) {
                nock('http://localhost:1337')
                    .get('/api/V1/model')
                    .reply(500);

                adapter.request('test', 'v1model', 'read', {}, {}, {}, function(err) {
                    assert.isDefined(err);
                    assert.equal(err.error.message, 'Remote host returned 500');
                    assert.equal(err.statusCode, 500);
                    done();
                });
            });

            it('should return a model instance with the correct instance methods', function(done) {
                nock('http://localhost:1337')
                    .get('/api/V1/model')
                    .reply(200, [{id: 123, desc: 'A stub object', value: 99}]);

                adapter.request('test', 'v1model', 'read', {}, {}, {}, function(err, result) {
                    if (err) return done(err);
                    assert.isFunction(result[0].ping);
                    done();
                });
            });
        });
    });
});

