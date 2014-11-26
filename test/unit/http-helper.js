var helper = require('../../lib/http-helper'),
    assert = require('chai').assert,
    nock = require('nock');

var connection, model;

describe('Http-helper', function() {
    beforeEach(function() {
        connection = require('../stubs/connections').test;
        model = require('../stubs/V1Model');
    });

    describe('constructUri function', function() {
        it('should exist', function() {
            assert.isDefined(helper.constructUri);
        });

        it('should construct a simple Uri', function() {
            var connection = {
                baseUri: 'http://localhost:1337'
            };
            var options = {
                path: 'test'
            };

            assert.equal(helper.constructUri(connection, options), 'http://localhost:1337/test');
        });
    });

    describe('makeRequest function', function() {
        it('should exist', function() {
            assert.isDefined(helper.makeRequest);
        });

        it('should return an error if no options are found for supplied method', function() {
            helper.makeRequest({}, {httpAdapter: {}}, 'read', {}, function(err, response, result) {
                assert.isDefined(err);
            });
        });

        it('should make a request to the url in the configuration', function(done) {
            nock('http://localhost:1337')
                .get('/api/V1/model')
                .reply(200);

            helper.makeRequest(connection, model, 'read', {}, function(err, response, result) {
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

            helper.makeRequest(connection, model, 'read', {}, function(err, response, result) {
                done(err);
            });
        });

        it('should make a request with custom headers and should override the adapter headers', function(done) {
            nock('http://localhost:1337')
                .matchHeader('token', 'abc123')
                .get('/api/V1/model')
                .reply(200);

            model.httpAdapter.read.headers = {
                'token': 'abc123'
            };

            // If this header takes precedence the request it will fail
            connection.headers = {
                'token': 'wrong_token'
            };

            helper.makeRequest(connection, model, 'read', {}, function(err, response, result) {
                done(err);
            });
        });

        it('should append adapter parameters to the url', function(done) {
            nock('http://localhost:1337')
                .get('/api/V1/model?foo=bar')
                .reply(200);

            connection.urlParameters = {
                'foo': 'bar'
            };

            helper.makeRequest(connection, model, 'read', {}, function(err, response, result) {
                done(err);
            });
        });
    });
});
