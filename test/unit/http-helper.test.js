var Helper = require('../../lib/http-helper'),
    assert = require('chai').assert,
    nock = require('nock'),
    _ = require('lodash'),
    testConnection = require('../stubs/connections').test, 
    v1model = require('../stubs/V1Model');

var connection, model, action, helper;

describe('Http-helper', function() {
    beforeEach(function() {
        connection = _.cloneDeep(testConnection);
        model = _.cloneDeep(v1model);
        action = model.http['read'];
    });

    describe('interpolate function', function() {
        it('should exist', function() {
            var helper = new Helper(connection, model, action, {}, {}, {});
            assert.isDefined(helper.interpolate);
        });

        it('should interpolate a string', function() {
            var source = 'Value is: {{value}}';
            var context = {
                value: 123
            };

            var helper = new Helper(connection, model, action, {}, {}, context);

            var result = helper.interpolate(source);

            assert.equal(result, 'Value is: 123');
        });

        it('should return the supplied source if no handlebar syntax is found', function() {
            var source = 'No interpolation found';
            var context = {};

            var helper = new Helper(connection, model, action, {}, {}, context);

            var result = helper.interpolate(source);

            assert.equal(result, 'No interpolation found');
        });

        it('should not fail if passed an undefined source', function() {
            var source;
            var context = {};

            var helper = new Helper(connection, model, action, {}, {}, context);

            var result = helper.interpolate(source);
            
            assert.equal(result, '');
        });
    });

    describe('field mapping', function() {
        describe('mapResponse function', function() {
            it('should exist', function() {
                var helper = new Helper(connection, model, action, {}, {}, {});
                assert.isDefined(helper.mapResponse);
            });

            describe('for JSON', function() {
                it('should return a correctly mapped object', function(done) {
                    var payload = require('../stubs/json-response').single;

                    model.http.read.mapping.response = {
                        desc: '$.outer.inner.value',
                        value: '$.outer.number',
                        longFieldName: 'long_field_name',
                        id: 'id'
                    };

                    model.http.read.pathSelector = '$.*';

                    var helper = new Helper(connection, model, action, {}, {}, {});

                    helper.mapResponse(payload, function(err, result) {
                        assert.equal(result[0].desc, 'test');
                        assert.equal(result[0].value, 1234);
                        assert.equal(result[0].id, '16SDNIFOD12DISJ012AN812A');
                        assert.equal(result[0].longFieldName, 'test');
                        done();
                    });
                });

                it('should properly map an array to an array field', function(done){
                    var payload = require('../stubs/json-response').singleArray;

                    model.attributes.collection = {
                        type: 'array'
                    };

                    model.http.read.mapping.response = {
                        collection: '$.outer.inner'
                    };

                    model.http.read.pathSelector = '$.*';

                    var helper = new Helper(connection, model, action, {}, {}, {});

                    helper.mapResponse(payload, function(err, result) {
                        assert.isArray(result[0].collection);
                        done(err);
                    });
                });

                it('should return a collection of correctly mapped object', function(done) {
                    var payload = require('../stubs/json-response').collection;

                    model.http.read.mapping.response = {
                        desc: '$.outer.inner.value',
                        value: '$.outer.number'
                    };

                    model.http.read.pathSelector = '$.v1models.*';

                    var helper = new Helper(connection, model, action, {}, {}, {});

                    helper.mapResponse(payload, function(err, result) {
                        assert.isArray(result);
                        assert(result.length > 1, 'Expected more than 1 result in the collection');
                        assert.equal(result[0].desc, 'test1');
                        assert.equal(result[1].desc, 'test2');
                        done(err);
                    });            
                });

                it('should attempt to find a key on the payload if no mapping is present', function(done) {
                    var payload = require('../stubs/json-response').single;

                    model.http.read.mapping.response = {};

                    model.http.read.pathSelector = '$.*';

                    var helper = new Helper(connection, model, action, {}, {}, {});

                    helper.mapResponse(payload, function(err, result) {
                        assert.equal(result[0].id, payload.v1model.id);
                        done(err);
                    });
                });

                it('should properly map a simple field value', function(done) {
                    var payload = require('../stubs/json-response').single;

                    model.http.read.mapping.response = {
                        'value': 'id'
                    };

                    action.format = 'json';

                    var helper = new Helper(connection, model, action, {}, {}, {});

                    helper.mapResponse(payload, function(err, results) {
                        assert.equal(results[0].value, '16SDNIFOD12DISJ012AN812A');
                        done();
                    });
                });

                it('should properly return a payload when using the $ selector', function(done) {
                    var payload = require('../stubs/json-response').singleNoRoot;

                    action.format = 'json';

                    model.http.read.pathSelector = '$';

                    var helper = new Helper(connection, model, action, {}, {}, {});

                    helper.mapResponse(payload, function(err, results) {
                        assert.equal(results[0].id, '16SDNIFOD12DISJ012AN812A');
                        done();
                    });
                });
            });

            describe('for XML', function() {
                it('should return a correctly mapped object', function(done) {
                    var payload = require('../stubs/xml-response').single;

                    var tag = action.objectNameMapping;

                    model.http.read.mapping.response = {
                        desc: '/' + tag + '/desc/text()'
                    };

                    model.http.read.pathSelector = '/v1model';

                    action.format = 'xml';

                    var helper = new Helper(connection, model, action, {}, {}, {});

                    helper.mapResponse(payload, function(err, result) {
                        assert(result[0].desc === 'A test response', 'Expected ' + result + ' to equal "A description"');
                        done(err);
                    });
                });

                it('should attempt to find a key on the payload if no mapping is present', function(done) {
                    var payload = require('../stubs/xml-response').single;

                    model.http.read.mapping.response = {};

                    model.http.read.pathSelector = '/v1model';

                    action.format = 'xml';

                    var helper = new Helper(connection, model, action, {}, {}, {});

                    helper.mapResponse(payload, function(err, result) {
                        assert(result[0].desc === 'A test response', 'Expected ' + result + ' to equal "A test response"');
                        done(err);
                    });            
                });

                it('should return a collection of correctly mapped objects', function(done) {
                    var payload = require('../stubs/xml-response').collection;

                    model.http.read.pathSelector = '/v1models/v1model';

                    action.format = 'xml';

                    var helper = new Helper(connection, model, action, {}, {}, {});

                    helper.mapResponse(payload, function(err, results) {
                        assert(results.length === 3, 'Expected 3 results to be found. Only found ' + results.length + '.');
                        assert.equal(results[0].id, 'ABC123');
                        assert.equal(results[1].id, 'DEF456');
                        assert.equal(results[2].id, 'GHI789');
                        done(err);
                    }); 
                });

                it('should return a collection of correctly mapped object with configured xpath mapping', function(done) {
                    var payload = require('../stubs/xml-response').collection;

                    model.http.read.mapping.response = {
                        desc:'desc/text()'
                    };

                    model.http.read.pathSelector = '/v1models/v1model';

                    action.format = 'xml';

                    var helper = new Helper(connection, model, action, {}, {}, {});

                    helper.mapResponse(payload, function(err, results) {
                        assert(results.length === 3, 'Expected 3 results to be found. Only found ' + results.length + '.');
                        //Assert that description mapping worked as expected
                        assert.equal(results[0].desc, 'A test response');
                        assert.equal(results[1].desc, 'Another response');
                        assert.equal(results[2].desc, '');
                        done(err);
                    });
                });

                it('should properly map a simple field value', function(done) {
                    var payload = require('../stubs/xml-response').collection;

                    model.http.read.mapping.response = {
                        'value': 'id'
                    };

                    model.http.read.pathSelector = '/v1models/v1model';

                    action.format = 'xml';

                    var helper = new Helper(connection, model, action, {}, {}, {});

                    helper.mapResponse(payload, function(err, results) {
                        assert.equal(results[0].value, 'ABC123');
                        done();
                    });
                });

                it('should properly determine a mapping is an xpath value', function(done) {
                    var payload = require('../stubs/xml-response').single;

                    model.http.read.mapping.response = {
                        'value': 'id'
                    };

                    model.http.read.pathSelector = '/v1model';

                    action.format = 'xml';

                    var helper = new Helper(connection, model, action, {}, {}, {});

                    helper.mapResponse(payload, function(err, results) {
                        // result.value should contain the <id> tags since our xpath selector
                        // doesn't include text(). the text() path will only be appended if
                        // the mapper doesn't think it's an Xpath selector.
                        assert.equal(results[0].value, 'ABC123');
                        done(err);
                    });
                });
            });
        });

        describe('mapRequest function', function() {
            it('should exist', function() {
                var helper = new Helper(connection, model, action, {}, {}, {});
                assert.isDefined(helper.mapRequest);
            });

            describe('for JSON', function() {
                var testObj;

                beforeEach(function() {
                    testObj = {
                        id: 123,
                        value: 55,
                        name: 'test'
                    };
                });

                it('should return a properly mapped object with mapping', function(done) {
                    model.http.read.mapping.request = {
                        id: 'a_field',
                        value: 'the_value'
                    };

                    var helper = new Helper(connection, model, action, {}, testObj, {});

                    helper.mapRequest(function(err, res) {
                        if(err) return done(err);
                        assert.equal(res.a_field, 123);
                        assert.equal(res.the_value, 55);
                        done();
                    });
                });

                it('should not map fields that do not have an appropriate mapping', function(done){
                    // No mapping provided for 'name' field. The name field should not
                    // appear in the mapped result.
                    model.http.read.mapping.request = {
                        id: 'id',
                        value: 'val'
                    };

                    var helper = new Helper(connection, model, action, {}, testObj, {});

                    helper.mapRequest(function(err, res) {
                        if (err) return done(err);
                        assert.isUndefined(res.name);
                        done();
                    });
                });
            });

            describe('for XML', function() {
                var testObj;

                beforeEach(function() {
                    action.format = 'xml';
                    testObj = {
                        value: 'something',
                        desc: 'a description'
                    };
                });

                it('should not map fields that do not have an appropriate mapping', function(done) {
                    action.mapping.request = {
                        'value': 'val'
                    };

                    var helper = new Helper(connection, model, action, {}, testObj, {});

                    helper.mapRequest(function(err, res) {
                        if (err) return done(err);
                        var expectedXml = '<v1model><val>something</val></v1model>';
                        assert.equal(expectedXml, res);
                        done();
                    });
                });

                it('should return a properly mapped payload with mapping', function(done) {
                    action.mapping.request = {
                        'value': 'some_value',
                        'desc': 'desc'
                    };

                    var helper = new Helper(connection, model, action, {}, testObj, {});

                    helper.mapRequest(function(err, res) {
                        if (err) return done(err);
                        var expectedXml = '<v1model><some_value>something</some_value><desc>a description</desc></v1model>';
                        assert.equal(expectedXml, res);
                        done();
                    });
                });
            });
        });
    });

    describe('constructUri function', function() {
        it('should exist', function() {
            var helper = new Helper(connection, model, action, {}, {}, {});
            assert.isDefined(helper.constructUri);
        });

        it('should construct a simple Uri', function() {
            var helper = new Helper(connection, model, action, {}, {}, {});
            assert.equal(helper.constructUri(), 'http://localhost:1337/api/V1/model');
        });

        it('should construct a Uri with query parameters in the connection config', function() {
            connection.urlParameters = {
                'foo': 'bar'
            };

            var helper = new Helper(connection, model, action, {}, {}, {});

            assert.equal(helper.constructUri(), 'http://localhost:1337/api/V1/model?foo=bar');
        });

        it('should construct a Uri with query parameters in the action configuration', function() {
            action.urlParameters = {
                'bar': 'baz'
            };

            var helper = new Helper(connection, model, action, {}, {}, {});

            assert.equal(helper.constructUri(), 'http://localhost:1337/api/V1/model?bar=baz');
        });

        it('should use route configuration params over connection configuration params', function() {
            connection.urlParameters = {
                'foo': 'bar'
            };

            action.urlParameters = {
                'foo': 'baz'
            };

            var helper = new Helper(connection, model, action, {}, {}, {});

            assert.equal(helper.constructUri(), 'http://localhost:1337/api/V1/model?foo=baz');
        });

        it('should encode the parameters of a GET into the url', function() {
            var urlParameters = {
                'fizz': 'bang'
            };

            var helper = new Helper(connection, model, action, urlParameters, {}, {});

            assert.equal(helper.constructUri(), 'http://localhost:1337/api/V1/model?fizz=bang');
        });

        it('should correctly interpolate the URL', function() {
            action.path = '/api/v1/model/{{id}}';

            var context = {
                id: 'abc123'
            };

            var helper = new Helper(connection, model, action, {}, {}, context);

            assert.equal(helper.constructUri(), 'http://localhost:1337/api/v1/model/abc123');
        });

        it('should correctly interpolate configured URL parameters', function() {
            action.urlParameters = {
                user: '{{query.id}}'
            };

            var context = {
                query: {
                    id: '1'
                }
            };

            var helper = new Helper(connection, model, action, {}, {}, context);

            assert.equal(helper.constructUri(), 'http://localhost:1337/api/V1/model?user=1');
        });

        it('should correctly create a URL that has a portion of the path in the base URL', function() {
            connection.baseUri = 'http://localhost:1337/api/v1';

            action.path = '/model';

            var helper = new Helper(connection, model, action, {}, {}, {});

            assert.equal(helper.constructUri(), 'http://localhost:1337/api/v1/model');
        });

        it('should correctly map and include any scope query params', function(done) {
            var context = {
                query: {
                    scope: 'all',
                    query: {
                        'longFieldName': 'abc555'
                    }
                }
            };

            var urlParams = {
                'limit': 50,
                'offset': 250
            };

            action.mapping.request = {
                'longFieldName': 'long_field_name'
            };

            var helper = new Helper(connection, model, action, urlParams, {}, context);
            var uri = helper.constructUri();
            assert(uri.indexOf('long_field_name=abc555') !== -1);
            done();
        });

        it('should not include scope query params if there is no mapping for that key', function(done) {
            var context = {
                query: {
                    scope: 'all',
                    query: {
                        'longFieldName': 'abc555'
                    }
                }
            };

            var urlParams = {
                'limit': 50,
                'offset': 250
            };

            var helper = new Helper(connection, model, action, urlParams, {}, context);
            var uri = helper.constructUri();
            assert(uri.indexOf('longFieldName=abc555') === -1, 'URI should not include longFieldName');
            done();
        });
    });

    describe('constructHeaders function', function() {
        var options;

        beforeEach(function() {
            options = model.http.read;
        });

        it('should exist', function() {
            var helper = new Helper(connection, model, action, {}, {}, {});
            assert.isDefined(helper.constructHeaders);
        });

        it('should return an object containing the adapter headers', function() {
            connection.headers = {
                'token': 'abc123'
            };

            var helper = new Helper(connection, model, action, {}, {}, {});

            var headers = helper.constructHeaders();

            assert.equal(headers.token, 'abc123' );
        });

        it('should properly override adapter headers with route headers', function() {
            action.headers = {
                'token': 'abc123'
            };

            // This header should not appear in the returned header object
            connection.headers = {
                'token': 'wrong_token'
            };

            var helper = new Helper(connection, model, action, {}, {}, {});

            var headers = helper.constructHeaders(connection, options);

            assert.equal(headers.token, 'abc123');
        });

        it('should set the content-type header to json if configured', function() {
            var helper = new Helper(connection, model, action, {}, {}, {});

            var headers = helper.constructHeaders();

            assert.equal(headers['Content-Type'], 'application/json');
        });

        it('should set the content-type header to xml if configured', function() {
            action.format = 'xml';

            var helper = new Helper(connection, model, action, {}, {}, {});

            var headers = helper.constructHeaders();

            assert.equal(headers['Content-Type'], 'application/xml');
        });

        it('should set the accept header to json if configured', function() {
            action.format = 'json';

            var helper = new Helper(connection, model, action, {}, {}, {});

            var headers = helper.constructHeaders(connection, options);

            assert.equal(headers['Accept'], 'application/json');
        });

        it('should use the adapter configuration if the route is set to form-encoded', function() {
            action.format = 'form-encoded';

            var helper = new Helper(connection, model, action, {}, {}, {});

            var headers = helper.constructHeaders(connection, options);

            assert.equal(headers['Accept'], 'application/json');
        });

        it('should use the route configuration over the adapter configuration', function() {
            connection.format = 'xml';
            action.format = 'json';

            var helper = new Helper(connection, model, action, {}, {}, {});

            var headers = helper.constructHeaders(connection, options);

            // Action format json should override the connection format xml
            assert.equal(headers['Accept'], 'application/json');
        });

        it('should create an Authorization basic header if supplied username and password', function() {
            var helper = new Helper(connection, model, action, {}, {}, {});

            var headers = helper.constructHeaders();

            assert.equal(headers['Authorization'], 'Basic dXNlcjpwYXNzd29yZA==');
        });

        it('should not create an Authorization basic header if supplied empty username', function() {
            connection.username = '';

            var helper = new Helper(connection, model, action, {}, {}, {});

            var headers = helper.constructHeaders();

            assert.isUndefined(headers['Authorization']);
        });

        it('should not create an Authorization basic header if supplied empty password', function() {
            connection.passwordPlainText = '';

            var helper = new Helper(connection, model, action, {}, {}, {});

            var headers = helper.constructHeaders();

            assert.isUndefined(headers['Authorization']);
        });

        it('should interpolate configured headers', function() {
            action.headers = {
                'Session': '{{id}}'
            };

            var context = {
                id: '123'
            };

            var helper = new Helper(connection, model, action, {}, {}, context);

            var headers = helper.constructHeaders();

            assert.equal(headers['Session'], '123');
        });

        it('should not clobber a configured Accept header', function() {
            action.headers = {
                'Accept': 'vnd.visa.CardFeatures.v1+json'
            };

            var helper = new Helper(connection, model, action, {}, {}, {});

            var headers = helper.constructHeaders();

            assert(headers['Accept'] === action.headers['Accept'], 'Unexpected Accept header: ' + headers['Accept']);
        });
    });

    describe('constructBody function', function() {
        it('should exist', function() {
            var helper = new Helper(connection, model, action, {}, {}, {});
            assert.isDefined(helper.constructBody);
        });

        it('should append the id to the body if missing on a post for JSON', function(done) {
            var values = {
                desc: 'abc',
                value: 100
            };

            var context = {
                params: {
                    id: 101
                }
            };

            action = {
                verb: 'POST',
                path: '/api/V1/model/101',
                format: 'json',
                headers: {},
                urlParameters: {},
                objectNameMapping: 'v1model',
                pathSelector: '$.*',
                bodyPayloadTemplate: '',
                mapping: {
                    response: {},
                    request: {}
                }
            };

            var helper = new Helper(connection, model, action, {}, values, context);

            helper.constructBody(function(err, res) {
                if (err) return done(err);
                res = JSON.parse(res);
                assert(res.id, 'Expected "id" on the outgoing payload');
                done();
            });
        });

        it('should append the id to the body if missing on a post for XML', function(done) {
           var values = {
                desc: 'abc',
                value: 100
            };

            var context = {
                params: {
                    id: 101
                }
            };

            action = {
                verb: 'POST',
                path: '/api/V1/model/101',
                format: 'xml',
                headers: {},
                urlParameters: {},
                objectNameMapping: 'v1model',
                pathSelector: '$.*',
                bodyPayloadTemplate: '',
                mapping: {
                    response: {},
                    request: {}
                }
            };

            var helper = new Helper(connection, model, action, {}, values, context);

            helper.constructBody(function(err, res) {
                if (err) return done(err);
                assert(res.indexOf('<id>') !== -1, 'Expected "id" on the outgoing payload');
                done();
            });
        });

        it('should return a stringified JSON object', function(done) {
            var values = {
                id: 123,
                desc: 'abc',
                value: 55
            };

            var helper = new Helper(connection, model, action, {}, values, {});

            helper.constructBody(function(err, res) {
                if(err) return done(err);
                assert(_.isString(res), 'Expected body to be a string');
                done(err);
            });
        });

        it('should return a singular object if the value is a single object', function(done) {
            var values = {
                id: 123,
                desc: 'abc',
                value: 55
            };

            var helper = new Helper(connection, model, action, {}, values, {});

            helper.constructBody(function(err, res) {
                if(err) return done(err);
                var parsedResults = JSON.parse(res);
                assert(!_.isArray(parsedResults), 'Should not be a collection');
                done();
            });
        });

        it('should return undefined if nothing can be used as a body', function(done) {
            var helper = new Helper(connection, model, action, {}, {}, {});

            helper.constructBody(function(err, res) {
                if(err) return done(err);
                assert(_.isEmpty(res), 'Expected body to be empty.');
                done();
            });
        });
    });

    describe('makeRequest function', function() {
        it('should exist', function() {
            var helper = new Helper(connection, model, action, {}, {}, {});
            assert.isDefined(helper.makeRequest);
        });

        it('should make a request to the url in the configuration', function(done) {
            nock('http://localhost:1337')
                .get('/api/V1/model')
                .reply(200);

            var helper = new Helper(connection, model, action, {}, {}, {});

            helper.makeRequest(function(err) {
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

            var helper = new Helper(connection, model, action, {}, {}, {});

            helper.makeRequest(function(err) {
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

            var helper = new Helper(connection, model, action, {}, {}, {});

            helper.makeRequest(function(err) {
                done(err);
            });
        });

        it('should handle an empty body with a selector', function(done) {
            nock('http://localhost:1337')
                .get('/api/V1/model')
                .reply(200);

            model.http.read.pathSelector = '$';

            var helper = new Helper(connection, model, action, {}, {}, {});

            helper.makeRequest(function(err, response, result) {
                if (err) return done(err);
                console.log(response.body);
                assert(!response.body, 'Body should be empty');
                assert(result.length === 0, 'Result should be empty array');
                done();
            });
        });

        it('should ignore a response body if no selector is supplied', function(done) {
            nock('http://localhost:1337')
                .get('/api/V1/model')
                .reply(200, {test: '123'});

            model.http.read.pathSelector = '';

            var helper = new Helper(connection, model, action, {}, {}, {});

            helper.makeRequest(function(err, response, result) {
                if (err) return done(err);
                assert(response.body);
                assert(result.length === 0, 'Result should be an empty array');
                done();
            });
        });
    });
});
