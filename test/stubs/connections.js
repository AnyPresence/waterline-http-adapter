module.exports = {
    test: {
        adapter: 'waterline-http',
        base_url: 'http://localhost:4567',
        logging_level: 'error',
        username: 'user',
        password_plain_text: 'password',
        format: 'json',
        headers: [],
        url_parameters: []
    }
};