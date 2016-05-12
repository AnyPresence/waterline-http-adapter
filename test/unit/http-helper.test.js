var Helper          = require('../../lib/http-helper'),
    assert          = require('chai').assert,
    nock            = require('nock'),
    _               = require('lodash'),
    testConnection  = require('../stubs/connections').test,
    v1model         = require('../stubs/V1Model'),
    certStubs       = require('../stubs/serialized-certs'),
    DOMParser       = require('xmldom').DOMParser,
    Promise         = require('bluebird');

var connection, model, action;

var deserializedCert = '-----BEGIN CERTIFICATE-----\nMIIB6zCCAVigAwIBAgIQEx/TYsUso4hClUyVqx2IvzAJBgUrDgMCHQUAMBMxETAP\nBgNVBAMTCENpdHJpeFFBMB4XDTEyMDgyOTE5MzUwNloXDTM5MTIzMTIzNTk1OVow\nEzERMA8GA1UEAxMIQ2l0cml4UUEwgZ8wDQYJKoZIhvcNAQEBBQADgY0AMIGJAoGB\nAKn2R93QUfcWIUS/gXNAGCcVFSo4F1ISaHUJK3Cc5ZyLqKp+JcZr5SLFJHRG6rlE\naR0CUiMqAZVdIDXBdK6C2gE9shrf4kIiQrkd3XF5IApAndZi/0H9F56H8SF9qBXe\nZxnuWtGs1dUdZa1QqmWLwfcl2UFX9+ngAH3jlZaCuJKXAgMBAAGjSDBGMEQGA1Ud\nAQQ9MDuAEIsNKYxnvXFKpmHzKat7es2hFTATMREwDwYDVQQDEwhDaXRyaXhRQYIQ\nEx/TYsUso4hClUyVqx2IvzAJBgUrDgMCHQUAA4GBAEndD5wNe2NK1j5RCfwLzvGA\nmg7eAKPBK42nFVmRLFnO3A9nCW813NaSeXpIJHDGYWCZaFCYZXvWlT0nnyntY43y\nJogIeHE7otKjYlXqABMSzF75X49McYhqZwCRl481HNLvZ2ibPpuY4fY9XYZyhstR\ne+LLXQsJhM17egwgEa8l\n-----END CERTIFICATE-----\n';
var deserializedKey = '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA14/lKHL5/JcjUiYVETEVNQX769L0JgZUjlHqWgDqrjdEXzZE\nxcnrZ282UicCUjlkfCyoDVyn2X1u8YReQT6IAeoV5SjuKNV84LLHw7gtdURLUccY\n2vGvdFBI/Kx+mCQWI0fdXJ2OYsI0Yj2X4oGnVv5pspNWsR324reEspv6zQXDFcds\nzq9iuritmAUAn1eHKIx+Cqz3ph4HS5GM+fv/UXBzbSNRWnF3ZyQwRLp66WQ+wl+G\nhacAqDiRK7zq9Pp7K48c6X1IlrgYC80iAamVHd788+/bBO7NY5TITgtI5ZPLpsCo\nNRHsKtAJgmFmCi3OLJoUohN81qIg7V/QeUg2UwIDAQABAoIBAQCW4/gB93G7+UPV\nNikbDqOMqTKt4c3bbCT2Nqr385pS9wbaKw+679vjXHrGyN2cFuaa8Vt1dv1bha0K\nTKD5xL7JsEVBUwRa+w3d7+dbvmm7o2Ghzd89K16o6aYdkNVQxDnm2mA+e193DABF\nIF5YRG+RuqbcRLyzYIk4LEQsDnlh1zQvg9IIEHKy1P8UQj8P0AI8v3rl4hWTx8BF\nCk5rah8Gmy18VnuOLp5i/pCSw+9/UdxR+kFSwKYx9j3XoTlGnwQdygE5SRyZ08rR\naxtQvptTwmqRhiqByP46ohTXBmDhUF0jhw8fbNZDaxVhEbx4iaNYzw1oups+nXIS\nZU/HUL5hAoGBAPovpNBDOXvsE/RsiZgqeb36FkYeoCqF6Q8qIR5Cn+v25QPrclEU\nU/Y6Xo1Lw3UybVFTEraZD5jPCauVk0H65LsfioZYKVR3c0Yfm1s4I1RSbIJWKzhq\nBMIMQHFHNb9yHZJ9TtwxOrHLZNnR0A9NnzJ/JpaCg/tCMW+Vjrfl7NsRAoGBANyS\nRfAW3IPU/XOud/JHyxA7dceR+ieXEqIFWwG/7Ct09ggQ1uuckjWiq0Qh0OmVI86S\nEXUkeqZ2YU41UgdxROULxCEMfwpVGFGFwA4u9Z7RB2xQaKR1RZLaA8Gwg/xaULQw\nBc6uAlUmzFeEG7IejbRpso+Yv+er87umoFmzZBMjAoGBAK+bm5L3bLT4CzWorZfa\nUKOxk8raGlBeuC0FxENKPphRL4Tl0dLpctnFNLL2+BYeNC8+IUd7/j+jK0V98uQA\nKGbUB9ausSvxwD77Vn/b0qiQRkviEepCOF7AXMdmVWqwveMiA6V5BJrhikN+Cw2C\nzXiTWVGSAPPvDWYmUwvv3qYRAoGASpTrMROJ3MnYKZWE2VeNQh/Y43Jos5pRopdM\n/np20Prrdi67fU+j4J7waklE6raTNPYPER0Um9TLcjZ1Vi7mrMwdtU8UZdoALxCa\nsDEQvHLRn75Qo8tDizRMsOGOv3WKdGMIk6oi/8fusGjrNH9ASxCyX/u2aA+sinb9\nIVeXLyECgYBkyRyzmtVkWTf6OB+6y6rKwCL+uD5JaV8NMiaBUQIIMaSiZeHt2Vql\nKmtSxGuzRfXTHvhYyrHLpEOmTyvTl11mxSnOD6USirUXiwCn0gP/kT2fVAf9z4kS\nZ/M6VggsLPFqvYEioszGbUcQFgK3qGrkXmos7EF+BV2z8BDwORQXTA==\n-----END RSA PRIVATE KEY-----\n';

describe('Http-helper', function() {
    beforeEach(function() {
        connection = _.cloneDeep(testConnection);
        model = _.cloneDeep(v1model);
        action = _.cloneDeep(model.http['read']);
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

                    action.mapping.response = {
                        desc: '$.outer.inner.value',
                        value: '$.outer.number',
                        longFieldName: 'long_field_name',
                        id: 'id'
                    };

                   action.pathSelector = '$.*';

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

                    action.mapping.response = {
                        collection: '$.outer.inner'
                    };

                    action.pathSelector = '$.*';

                    var helper = new Helper(connection, model, action, {}, {}, {});

                    helper.mapResponse(payload, function(err, result) {
                        assert.isArray(result[0].collection);
                        done(err);
                    });
                });

                it('should return a collection of correctly mapped object', function(done) {
                    var payload = require('../stubs/json-response').collection;

                    action.mapping.response = {
                        desc: '$.outer.inner.value',
                        value: '$.outer.number'
                    };

                    action.pathSelector = '$.v1models.*';

                    var helper = new Helper(connection, model, action, {}, {}, {});

                    helper.mapResponse(payload, function(err, result) {
                        assert.isArray(result);
                        assert(result.length > 1, 'Expected more than 1 result in the collection');
                        assert.equal(result[0].desc, 'test1');
                        assert.equal(result[1].desc, 'test2');
                        done(err);
                    });
                });

                it('should properly map a simple field value', function(done) {
                    var payload = require('../stubs/json-response').single;

                    action.mapping.response = {
                        'value': 'id'
                    };

                    action.format = 'json';

                    var helper = new Helper(connection, model, action, {}, {}, {});

                    helper.mapResponse(payload, function(err, results) {
                        assert.equal(results[0].value, '16SDNIFOD12DISJ012AN812A');
                        done();
                    });
                });

                it('should not include fields not present in the response mapping', function(done) {
                    var payload = require('../stubs/json-response').single;

                    action.mapping.response = {
                        'the_id': 'id'
                    };

                    action.format = 'json';

                    var helper = new Helper(connection, model, action, {}, {}, {});

                    helper.mapResponse(payload, function(err, results) {
                        if (err) return done(err);
                        assert(!('longFieldName' in results), 'Results contain an unmapped key, the key should not be returned on this object');
                        done();
                    });
                });

                it('should properly return a payload when using the $ selector', function(done) {
                    var payload = require('../stubs/json-response').singleNoRoot;

                    action.mapping.response = {
                        'id': 'id'
                    };

                    action.format = 'json';

                    action.pathSelector = '$';

                    var helper = new Helper(connection, model, action, {}, {}, {});

                    helper.mapResponse(payload, function(err, results) {
                        assert.equal(results[0].id, '16SDNIFOD12DISJ012AN812A');
                        done();
                    });
                });
            });

            describe('for XML', function() {
                it('should return a correctly mapped object', function(done) {
                    var payload = new DOMParser().parseFromString(require('../stubs/xml-response').single);

                    var tag = action.objectNameMapping;

                    action.mapping.response = {
                        desc: '/' + tag + '/desc/text()'
                    };

                    action.pathSelector = '/v1model';

                    action.format = 'xml';

                    var helper = new Helper(connection, model, action, {}, {}, {});

                    helper.mapResponse(payload, function(err, result) {
                        assert(result[0].desc === 'A test response', 'Expected ' + result + ' to equal "A description"');
                        done(err);
                    });
                });

                it('should return a collection of correctly mapped objects', function(done) {
                    var payload = new DOMParser().parseFromString(require('../stubs/xml-response').collection);

                    action.mapping.response = {
                        id: 'id/text()'
                    };

                    action.pathSelector = '/v1models/v1model';

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
                    var payload = new DOMParser().parseFromString(require('../stubs/xml-response').collection);

                    action.mapping.response = {
                        desc:'desc/text()'
                    };

                    action.pathSelector = '/v1models/v1model';

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
                    var payload = new DOMParser().parseFromString(require('../stubs/xml-response').collection);

                    action.mapping.response = {
                        'value': 'id'
                    };

                    action.pathSelector = '/v1models/v1model';

                    action.format = 'xml';

                    var helper = new Helper(connection, model, action, {}, {}, {});

                    helper.mapResponse(payload, function(err, results) {
                        assert.equal(results[0].value, 'ABC123');
                        done();
                    });
                });

                it('should properly determine a mapping is an xpath value', function(done) {
                    var payload = new DOMParser().parseFromString(require('../stubs/xml-response').single);

                    action.mapping.response = {
                        'value': 'id'
                    };

                    action.pathSelector = '/v1model';

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

            describe('for form-encoded', function() {
                var testObj;

                beforeEach(function() {
                    testObj = {
                        id: 999,
                        value: 23,
                        desc: "'test' value"
                    };
                });

                it('should return a properly mapped payload', function(done) {
                    action.format = 'form_encoded';
                    action.mapping.request = {
                        id: 'id',
                        value: 'a_value',
                        desc: 'description'
                    };

                    var helper = new Helper(connection, model, action, {}, testObj, {});

                    helper.mapRequest(function(err, res) {
                        if (err) return done(err);
                        assert.equal(res, 'id=999&description=\'test\'+value&a_value=23');
                        done();
                    });
                });
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
                    action.mapping.request = {
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
                    action.mapping.request = {
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

        it('should correctly encode a complex query parameter', function() {
            action.urlParameters = {
                '$filter': 'StartDate eq \'{{req.startDate}}\' and EndDate eq \'{{req.endDate}}\''
            };

            var context = {
                req: {
                    startDate: '20150413',
                    endDate: '20150417'
                }
            };

            var helper = new Helper(connection, model, action, {}, {}, context);


            assert.equal(helper.constructUri(), 'http://localhost:1337/api/V1/model?%24filter=StartDate+eq+%2720150413%27+and+EndDate+eq+%2720150417%27');
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

        it('should correctly interpolate the connection baseUri', function() {
            action.path = '/api/v1/model/{{id}}';

            connection.baseUri = 'http://{{url}}:1337';

            var context = {
                id: 'abc123',
                url: 'mysite.com'
            };

            var helper = new Helper(connection, model, action, {}, {}, context);

            assert.equal(helper.constructUri(), 'http://mysite.com:1337/api/v1/model/abc123');
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
            options = action;
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

        it('should properly override adapter headers with action headers', function() {
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

        it('should set the content-type header to application/x-www-form-urlencoded if configured', function() {
            action.format = 'form-encoded';

            var helper = new Helper(connection, model, action, {}, {}, {});

            var headers = helper.constructHeaders(connection, options);

            assert.equal(headers['Content-Type'], 'application/x-www-form-urlencoded');
            assert.notEqual(headers['Content-Type'], 'application/json');
            assert.notEqual(headers['Content-Type'], 'application/xml');
        });

        it('should set the Accept header to the adapter configuration if the action is form-encoded', function() {
            action.format = 'form-encoded';

            var helper = new Helper(connection, model, action, {}, {}, {});

            var headers = helper.constructHeaders(connection, options);

            assert.equal(headers['Content-Type'], 'application/x-www-form-urlencoded');
            assert.equal(headers['Accept'], 'application/json');
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

        it('should properly interpolate Authorization header username', function() {
            connection.username = '{{username}}';

            var context = {
                username: 'bob'
            };

            var helper = new Helper(connection, model, action, {}, {}, context);

            var headers = helper.constructHeaders();

            assert.equal(headers['Authorization'], 'Basic Ym9iOnBhc3N3b3Jk');
        });

        it('should properly interpolate Authorization header password', function() {
            connection.passwordPlainText = '{{password}}';

            var context = {
                password: 'secret'
            };

            var helper = new Helper(connection, model, action, {}, {}, context);

            var headers = helper.constructHeaders();

            assert.equal(headers['Authorization'], 'Basic dXNlcjpzZWNyZXQ=');
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
        
        describe('with afterRawResponse callback', () => {
            'use strict';
            
            afterEach(() => {
                connection.afterRawResponse = null;
            });

            it('should execute the callback', done => {
                nock('http://localhost:1337')
                .get('/api/V1/model')
                .reply(200);
                
                let called = false;

                let fn = function(response, cb) {
                    called = true;
                    cb();
                }

                connection.afterRawResponse = Promise.promisify(fn);
                
                let helper = new Helper(connection, model, action, {}, {}, {});
                helper.makeRequest(e => {
                    assert(called, 'afterRawResponse was not called');
                    done(e);
                });
            });
            
            it('should supply the raw response', done => {
                nock('http://localhost:1337')
                .get('/api/V1/model')
                .reply(200);

                let fn = function(response, cb) {
                    assert.isDefined(response);
                    cb();
                }
    
                connection.afterRawResponse = Promise.promisify(fn);

                let helper = new Helper(connection, model, action, {}, {}, {});
                helper.makeRequest(() => { 
                    done();
                });
            });
        });

        describe('with beforeRawRequest callback', () => {
            'use strict';

            afterEach(() => {
                connection.beforeRawRequest = null;
            })

            it('should execute the callback', (done) => {
                let fn = function(params, cb) {
                    done();
                }
                
                connection.beforeRawRequest = Promise.promisify(fn);

                let helper = new Helper(connection, model, action, {}, {}, {});
                helper.makeRequest(() => {});
            });

            it('should supply the raw request options', (done) => {
                let fn = function(options, cb) {
                    assert.isDefined(opts.url);
                    assert.isDefined(opts.body);
                    assert.isDefined(opts.method);
                    assert.isDefined(opts.headers);
                    cb();
                };

                connection.beforeRawRequest = Promise.promisify(fn);    

                let helper = new Helper(connection, model, action, {}, {}, {});
                helper.makeRequest(() => { done(); });
            });
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

            action.headers = {
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

            action.pathSelector = '$';

            var helper = new Helper(connection, model, action, {}, {}, {});

            helper.makeRequest(function(err, response, result) {
                if (err) return done(err);
                assert(!response.body, 'Body should be empty');
                assert(result.length === 0, 'Result should be empty array');
                done();
            });
        });

        it('should ignore a response body if no selector is supplied', function(done) {
            nock('http://localhost:1337')
                .get('/api/V1/model')
                .reply(200, {test: '123'});

            action.pathSelector = '';

            var helper = new Helper(connection, model, action, {}, {}, {});

            helper.makeRequest(function(err, response, result) {
                if (err) return done(err);
                assert(response.body);
                assert(result.length === 0, 'Result should be an empty array');
                done();
            });
        });

        it('should respond with an error if the status code is not 2xx', function(done) {
            nock('http://localhost:1337')
                .get('/api/V1/model')
                .reply(400, '{"error": "Bad request"}');

            var helper = new Helper(connection, model, action, {}, {}, {});

            helper.makeRequest(function(err, response, result) {
                assert.equal(err.message, "Remote host returned 400");
                assert.equal(err.statusCode, 400);
                assert.equal(err.responseBody, '{"error": "Bad request"}');
                done();
            });
        });

        it('should return an empty result if the response body is empty', function(done) {
            nock('http://localhost:1337')
                .get('/api/V1/model')
                .reply(200, "");

            var helper = new Helper(connection, model, action, {}, {}, {});

            helper.makeRequest(function(err, response, result) {
                assert.lengthOf(result, 0);
                done();
            });
        });

        describe('for JSON errors', function() {
            it ('should respond with a parsedResponseBody if the responseBody was successfully parsed', function(done) {
                nock('http://localhost:1337')
                    .get('/api/V1/model')
                    .reply(400, "{ \"error\": \"Bad request\" }");

                var helper = new Helper(connection, model, action, {}, {}, {});
                helper.makeRequest(function(err, response, result) {
                    assert.deepEqual(err.parsedResponseBody, {error: 'Bad request'});
                    done();
                });

            });

            it('should respond with a null parsedResponseBody if the responseBody was not valid', function(done) {
                nock('http://localhost:1337')
                    .get('/api/V1/model')
                    .reply(400, "Bad request");

                var helper = new Helper(connection, model, action, {}, {}, {});

                helper.makeRequest(function(err, response, result) {
                    assert.isNull(err.parsedResponseBody);
                    done();
                });
            });
        });

        describe('for XML errors', function() {
            it ('should respond with a parsedResponseBody if the responseBody was successfully parsed', function(done) {
                nock('http://localhost:1337')
                    .get('/api/V1/model')
                    .reply(400, "<error>bad request</error>");

                action.format = 'xml';
                var helper = new Helper(connection, model, action, {}, {}, {});

                helper.makeRequest(function(err) {
                    assert.isNotNull(err.parsedResponseBody.documentElement);
                    done();
                });

            });

            it('should respond with a null parsedResponseBody if the responseBody was not valid', function(done) {
                nock('http://localhost:1337')
                    .get('/api/V1/model')
                    .reply(400, "Bad request");

                action.format = 'xml';
                var helper = new Helper(connection, model, action, {}, {}, {});

                helper.makeRequest(function(err, response, result) {
                    assert.isNull(err.parsedResponseBody);
                    done();
                });
            });
        });
    });

    describe('addTlsOptions', function() {
        afterEach(function() {
            delete process.env.HTTP_TEST_SERIALIZED_CERT;
            delete process.env.HTTP_ADAPTER_SERIALIZED_PRIVATE_KEY;
            delete process.env.HTTP_TEST_SERIALIZED_PFX;
            delete process.env.HTTP_TEST_SERIALIZED_CA_CERT;
            delete process.env.HTTP_TEST_PASSPHRASE;
        });

        it('should exist', function() {
            var helper = new Helper(connection, model, action, {}, {}, {});
            assert.isDefined(helper.addTlsOptions);
        });

        it('should not create any agent options if nothing is present in the process.env', function() {
            var helper = new Helper(connection, model, action, {}, {}, {});
            var options = {};
            helper.addTlsOptions(options);

            assert.isUndefined(options.agentOptions);
        });

        it('should create a "cert" key if present in the process.env', function() {
            process.env.HTTP_TEST_SERIALIZED_CERT = certStubs.cert;

            var helper = new Helper(connection, model, action, {}, {}, {});
            var options = {};
            helper.addTlsOptions(options);

            assert.isDefined(options.agentOptions);
            assert.isDefined(options.agentOptions.cert);
            // Should be deserialized.
            assert.equal(options.agentOptions.cert, deserializedCert);
        });

        it('should create a "caCert" key is present in the process.env', function() {
            process.env.HTTP_TEST_SERIALIZED_CA_CERT = certStubs.cert;

            var helper = new Helper(connection, model, action, {}, {}, {});
            var options = {};
            helper.addTlsOptions(options);

            assert.isDefined(options.agentOptions);
            assert.isDefined(options.agentOptions.ca);
            // Should be deserialized.
            assert.equal(options.agentOptions.ca, deserializedCert);
        });

        it('should create a "key" key if present in the process.env', function() {
            process.env.HTTP_TEST_SERIALIZED_PRIVATE_KEY = certStubs.key;

            var helper = new Helper(connection, model, action, {}, {}, {});
            var options = {};
            helper.addTlsOptions(options);

            assert.isDefined(options.agentOptions);
            assert.isDefined(options.agentOptions.key);
            // Should be deserialized.
            assert.equal(options.agentOptions.key, deserializedKey);
        });

        it('should create a "pfx" key if present in process.env', function() {
            process.env.HTTP_TEST_SERIALIZED_PFX = certStubs.cert;

            var helper = new Helper(connection, model, action, {}, {}, {});
            var options = {};
            helper.addTlsOptions(options);

            assert.isDefined(options.agentOptions);
            assert.isDefined(options.agentOptions.pfx);
            // Should be deserialized.
            assert.equal(options.agentOptions.pfx, deserializedCert);
        });

        it('should create a "passphrase" key if present in process.env', function() {
            process.env.HTTP_TEST_PASSPHRASE = 'test';

            var helper = new Helper(connection, model, action, {}, {}, {});
            var options = {};
            helper.addTlsOptions(options);

            assert.isDefined(options.agentOptions);
            assert.isDefined(options.agentOptions.passphrase);
            assert.equal(options.agentOptions.passphrase, 'test');
        });
    });

    describe('Odata support', function() {
        beforeEach(() => {
            connection.legacyOdataSupport = true;
        });

        after(() => {
            connection.legacyOdataSupport = false;
        });
        
        describe('URI characters and encoding', function() {
            it('should not encode special characters', function() {
                action.path = `/api/v1/categories('products')`; 

                var expected = "http://localhost:1337/api/v1/categories('products')";

                var helper = new Helper(connection, model, action, {}, {}, {});
                var result = helper.constructUri();

                assert.equal(result, expected);
            });             

            it ('should properly interpolate the base path', function() {    
                action.path = `/api/v1/categories('{{query.category}}')`;
                var context = { query: { category: 'widgets' } };
                var expected = "http://localhost:1337/api/v1/categories('widgets')"; 

                var helper = new Helper(connection, model, action, {}, {}, context);
                var result = helper.constructUri();

                assert.equal(result, expected);
            });

            it('should properly append query parameters that have special characters', function() {
                action.path = `/api/v1/categories('widgets')`;
                action.urlParameters = { "$color": "red" };
                
                var expected = "http://localhost:1337/api/v1/categories('widgets')?$color=red";

                var helper = new Helper(connection, model, action, {}, {}, {});
                var result = helper.constructUri();

                assert.equal(result, expected);
            });
        }); 
    });

});
