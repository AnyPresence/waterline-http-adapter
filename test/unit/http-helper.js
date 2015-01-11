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
        action = model.http['read'];
    });

    describe('interpolate function', function() {
        it('should exist', function() {
            assert.isDefined(helper.interpolate);
        });

        it('should interpolate a string', function() {
            var source = 'Value is: {{value}}';
            var context = {
                value: 123
            };

            var result = helper.interpolate(source, context);

            assert.equal(result, 'Value is: 123');
        });

        it('should return the supplied source if no handlebar syntax is found', function() {
            var source = 'No interpolation found';
            var context = {};

            var result = helper.interpolate(source, context);

            assert.equal(result, 'No interpolation found');
        });

        it('should not fail if passed an undefined source', function() {
            var source;
            var context = {};

            var result = helper.interpolate(source, context);
            
            assert.equal(result, '');
        });
    });

    describe('mapFields function', function() {
        it('should exist', function() {
            assert.isDefined(helper.mapFields);
        });

        it('should return a correctly mapped object for JSON', function(done) {
            var payload = require('../stubs/json-response').single;

            model.http.read.mapping = {
                desc: '$.outer.inner.value',
                value: '$.outer.number'
            };

            model.http.read.pathSelector = '$.*';

            helper.mapFields(payload, model, action, function(err, result) {
                assert.equal(result[0].desc, 'test');
                assert.equal(result[0].value, 1234);
                assert.equal(result[0].id, '16SDNIFOD12DISJ012AN812A');
                done();
            });
        });

        it('should properly map an array to an array field', function(done){
            var payload = require('../stubs/json-response').singleArray;

            model.attributes.collection = {
                type: 'array'
            };

            model.http.read.mapping = {
                collection: '$.outer.inner'
            };

            model.http.read.pathSelector = '$.*';

            helper.mapFields(payload, model, action, function(err, result) {
                assert.isArray(result[0].collection);
                done(err);
            });
        });

        it('should return a collection of correctly mapped objects for JSON', function(done) {
            var payload = require('../stubs/json-response').collection;

            model.http.read.mapping = {
                desc: '$.outer.inner.value',
                value: '$.outer.number'
            };

            model.http.read.pathSelector = '$.v1models.*';

            helper.mapFields(payload, model, action, function(err, result) {
                assert.isArray(result);
                assert(result.length > 1, 'Expected more than 1 result in the collection');
                assert.equal(result[0].desc, 'test1');
                assert.equal(result[1].desc, 'test2');
                done(err);
            });            
        });

        it('should attempt to find a key on the payload if no mapping is present for JSON', function(done) {
            var payload = require('../stubs/json-response').single;

            model.http.read.mapping = {};

            model.http.read.pathSelector = '$.*';

            helper.mapFields(payload, model, action, function(err, result) {
                assert.equal(result[0].id, payload.v1model.id);
                done(err);
            });
        });

        it('should return a correctly mapped object for XML', function(done) {
            var payload = require('../stubs/xml-response').single;

            var tag = action.objectNameMapping;

            model.http.read.mapping = {
                desc: '/' + tag + '/desc/text()'
            };

            model.http.read.pathSelector = '/v1model';

            action.format = 'xml';

            helper.mapFields(payload, model, action, function(err, result) {
                assert(result[0].desc === 'A test response', 'Expected ' + result + ' to equal "A description"');
                done(err);
            });
        });

        it('should attempt to find a key on the payload if no mapping is present for XML', function(done) {
            var payload = require('../stubs/xml-response').single;

            model.http.read.mapping = {};

            model.http.read.pathSelector = '/v1model';

            action.format = 'xml';

            helper.mapFields(payload, model, action, function(err, result) {
                assert(result[0].desc === 'A test response', 'Expected ' + result + ' to equal "A test response"');
                done(err);
            });            
        });

        it('should return a collection of correctly mapped objects for XML', function(done) {
            var payload = require('../stubs/xml-response').collection;

            model.http.read.pathSelector = '/v1models/v1model';

            action.format = 'xml';

            helper.mapFields(payload, model, action, function(err, results) {
                assert(results.length === 3, 'Expected 3 results to be found. Only found ' + results.length + '.');
                assert.equal(results[0].id, 'ABC123');
                assert.equal(results[1].id, 'DEF456');
                assert.equal(results[2].id, 'GHI789');
                done(err);
            }); 
        });

        it('should return a collection of correctly mapped object for XML with configured xpath mapping', function(done) {
            var payload = require('../stubs/xml-response').collection;

            model.http.read.mapping = {
                desc:'desc/text()'
            };

            model.http.read.pathSelector = '/v1models/v1model';

            action.format = 'xml';

            helper.mapFields(payload, model, action, function(err, results) {
                assert(results.length === 3, 'Expected 3 results to be found. Only found ' + results.length + '.');
                //Assert that description mapping worked as expected
                assert.equal(results[0].desc, 'A test response');
                assert.equal(results[1].desc, 'Another response');
                assert.equal(results[2].desc, '');
                done(err);
            });
        });

        it('should properly map a simple field value for json', function(done) {
            var payload = require('../stubs/json-response').single;

            model.http.read.mapping = {
                'value': 'id'
            };

            action.format = 'json';

            helper.mapFields(payload, model, action, function(err, results) {
                assert.equal(results[0].value, '16SDNIFOD12DISJ012AN812A');
                done();
            });
        });

        it('should properly map a simple field value for xml', function(done) {
            var payload = require('../stubs/xml-response').collection;

            model.http.read.mapping = {
                'value': 'id'
            };

            model.http.read.pathSelector = '/v1models/v1model';

            action.format = 'xml';

            helper.mapFields(payload, model, action, function(err, results) {
                assert.equal(results[0].value, '<id>ABC123</id>');
                done();
            });
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

        it('should correctly interpolate the URL', function() {
            action.path = '/api/v1/model/{{id}}';

            var context = {
                id: 'abc123'
            };

            assert.equal(helper.constructUri(connection, action, {}, context), 'http://localhost:1337/api/v1/model/abc123');
        });

        it('should correctly interpolate configured URL parameters', function() {
            action.urlParameters = {
                user: '{{id}}'
            };

            var context = {
                id: '1'
            };

            assert.equal(helper.constructUri(connection, action, {}, context), 'http://localhost:1337/api/V1/model?user=1');
        });

        it('should correctly create a URL that has a portion of the path in the base URL', function() {
            connection.baseUri = 'http://localhost:1337/api/v1';

            action.path = '/model';

            assert.equal(helper.constructUri(connection, action, {}, {}), 'http://localhost:1337/api/v1/model');
        });
    });

    describe('constructHeaders function', function() {
        var options;

        beforeEach(function() {
            options = model.http.read;
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

        it('should interpolate configured headers', function() {
            action.headers = {
                'Session': '{{id}}'
            };

            var context = {
                id: '123'
            };

            var headers = helper.constructHeaders(connection, options, context);

            assert.equal(headers['Session'], '123');
        });
    });

    describe('constructBody function', function() {
        it('should exist', function() {
            assert.isDefined(helper.constructBody);
        });

        it('should return a stringified JSON object', function() {
            var values = {
                id: 123
            };

            var body = helper.constructBody(action, values, {});

            assert(_.isString(body), 'Expected body to be a string');

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

            helper.makeRequest(connection, model, action, {}, {}, {}, function(err) {
                done(err);
            });
        });

        it('should make a request with custom headers', function(done) {
            nock('http://localhost:1337')
                .matchHeader('token', 'abc123')
                .get('/api/V1/model')
                .reply(200);

            model.http.read.headers = {
                'token': 'abc123'
            };

            helper.makeRequest(connection, model, action, {}, {}, {}, function(err) {
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

            helper.makeRequest(connection, model, action, {}, {}, {}, function(err) {
                done(err);
            });
        });
    });
});
