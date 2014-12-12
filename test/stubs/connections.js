module.exports = {
    test: {
        adapter: 'waterline-http',
        baseUri: 'http://localhost:1337',
        loggingLevel: 'error',
        username: 'user',
        passwordPlainText: 'password',
        format: 'json',
        headers: {},
        urlParameters: {}
    }
};