var helper = require('../../lib/http-helper'),
    assert = require('chai').assert,
    nock = require('nock'),
    _ = require('lodash'),
    testConnection = require('../stubs/connections').test, 
    v1model = require('../stubs/V1Model');

var connection, model, action;

describe('Http-helper', function() {
    beforeEach(function() {
        connection = _.cloneDeep(testConnection);
        model = _.cloneDeep(v1model);
        action = model.httpAdapter['read'];
    });

    describe('mapFields function', function() {
        it('should exist', function() {
            assert.isDefined(helper.mapFields);
        });

        it('should return a correctly mapped object for JSON', function() {
            var payload = require('../stubs/json-response').single;

            model.httpAdapter.read.mapping = {
                desc: '$.outer.inner.value',
                value: '$.outer.number'
            };

            var result = helper.mapFields(payload, model, action);
            
            assert.equal(result.desc, 'test');
            assert.equal(result.value, 1234);
            assert.equal(result.id, '16SDNIFOD12DISJ012AN812A');
        });

        it('should properly map an array to an array field', function(){
            var payload = require('../stubs/json-response').singleArray;

            model.attributes.collection = {
                type: 'array'
            };

            model.httpAdapter.read.mapping = {
                collection: '$.outer.inner'
            };

            var result = helper.mapFields(payload, model, action);
            assert.isArray(result.collection);

        });

        it('should return a collection of correctly mapped objects for JSON', function() {
            var payload = require('../stubs/json-response').collection;

            model.httpAdapter.read.mapping = {
                desc: '$.outer.inner.value',
                value: '$.outer.number'
            };

            var result = helper.mapFields(payload, model, action);

            assert.isArray(result);
            assert(result.length > 1, 'Expected more than 1 result in the collection');
        });

        it('should return a correctly mapped object for XML', function() {
            var payload = require('../stubs/xml-response');

            model.httpAdapter.read.mapping = {
                desc: '/note/desc/text()'
            };

            action.format = 'xml';

            var result = helper.mapFields(payload, model, action);

            assert.equal(result.desc, 'A description');
        });
    });

    describe('constructUri function', function() {
        it('should exist', function() {
            assert.isDefined(helper.constructUri);
        });

        it('should construct a simple Uri', function() {
            assert.equal(helper.constructUri(connection, action), 'http://localhost:1337/api/V1/model');
        });

        it('should construct a Uri with query parameters in the connection config', function() {
            connection.urlParameters = {
                'foo': 'bar'
            };

            assert.equal(helper.constructUri(connection, action), 'http://localhost:1337/api/V1/model?foo=bar');
        });

        it('should construct a Uri with query parameters in the action configuration', function() {
            action.urlParameters = {
                'bar': 'baz'
            };

            assert.equal(helper.constructUri(connection, action), 'http://localhost:1337/api/V1/model?bar=baz');
        });

        it('should use route configuration params over connection configuration params', function() {
            connection.urlParameters = {
                'foo': 'bar'
            };

            action.urlParameters = {
                'foo': 'baz'
            };

            assert.equal(helper.constructUri(connection, action), 'http://localhost:1337/api/V1/model?foo=baz');
        });

        it('should encode the parameters of a GET into the url', function() {
            var options = {
                'fizz': 'bang'
            };

            assert.equal(helper.constructUri(connection, action, options), 'http://localhost:1337/api/V1/model?fizz=bang');
        });

        it('should not append the parameters to the url for a POST', function() {
            var options = {
                'fizz': 'bang'
            };

            action.verb = 'POST';

            assert.equal(helper.constructUri(connection, action, options), 'http://localhost:1337/api/V1/model');
        });
    });

    describe('constructHeaders function', function() {
        var options;

        beforeEach(function() {
            options = model.httpAdapter.read;
        });

        it('should exist', function() {
            assert.isDefined(helper.constructHeaders);
        });

        it('should return an object containing the adapter headers', function() {
            connection.headers = {
                'token': 'abc123'
            };

            var headers = helper.constructHeaders(connection, {});

            assert.equal(headers.token, 'abc123' );
        });

        it('should properly override adapter headers with route headers', function() {
            var options = {
                headers: {
                    'token': 'abc123'
                }
            };

            // This header should not appear in the returned header object
            connection.headers = {
                'token': 'wrong_token'
            };

            var headers = helper.constructHeaders(connection, options);

            assert.equal(headers.token, 'abc123');
        });

        it('should set the content-type header to json if configured', function() {
            var headers = helper.constructHeaders(connection, options);

            assert.equal(headers['Content-Type'], 'application/json');
        });

        it('should set the content-type header to xml if configured', function() {
            options.format = 'xml';

            var headers = helper.constructHeaders(connection, options);

            assert.equal(headers['Content-Type'], 'application/xml');
        });

        it('should set the accepts header to json if configured', function() {
            options.format = 'json';

            var headers = helper.constructHeaders(connection, options);

            assert.equal(headers['Accepts'], 'application/json');
        });

        it('should use the adapter configuration if the route is set to form-encoded', function() {
            options.format = 'form-encoded';

            var headers = helper.constructHeaders(connection, options);

            assert.equal(headers['Accepts'], 'application/json');
        });

        it('should use the route configuration over the adapter configuration', function() {
            connection.format = 'xml';
            options.format = 'json';

            var headers = helper.constructHeaders(connection, options);

            assert.equal(headers['Accepts'], 'application/json');
        });

        it('should create an Authorization basic header if supplied username and password', function() {
            var headers = helper.constructHeaders(connection, options);

            assert.equal(headers['Authorization'], 'Basic dXNlcjpwYXNzd29yZA==');
        });

        it('should not create an Authorization basic header if supplied empty username', function() {
            connection.username = '';

            var headers = helper.constructHeaders(connection, options);

            assert.isUndefined(headers['Authorization']);
        });

        it('should not create an Authorization basic header if supplied empty password', function() {
            connection.passwordPlainText = '';

            var headers = helper.constructHeaders(connection, options);

            assert.isUndefined(headers['Authorization']);
        });
    });

    describe('constructBody function', function() {
        it('should exist', function() {
            assert.isDefined(helper.constructBody);
        });
    });

    describe('makeRequest function', function() {
        it('should exist', function() {
            assert.isDefined(helper.makeRequest);
        });

        it('should make a request to the url in the configuration', function(done) {
            nock('http://localhost:1337')
                .get('/api/V1/model')
                .reply(200);

            helper.makeRequest(connection, model, action, {}, {}, function(err) {
                done(err);
            });
        });

        it('should make a request with custom headers', function(done) {
            nock('http://localhost:1337')
                .matchHeader('token', 'abc123')
                .get('/api/V1/model')
                .reply(200);

            model.httpAdapter.read.headers = {
                'token': 'abc123'
            };

            helper.makeRequest(connection, model, action, {}, {}, function(err) {
                done(err);
            });
        });

        it('should make a request with url parameters', function(done) {
            nock('http://localhost:1337')
                .get('/api/V1/model?foo=bar')
                .reply(200);

            connection.urlParameters = {
                'foo': 'bar'
            };

            helper.makeRequest(connection, model, action, {}, {}, function(err) {
                done(err);
            });
        });
    });
});
