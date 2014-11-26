module.exports = {
    connection: 'test',
    attributes: {
        id: {
            type: 'integer'
        },
        desc: {
            type: 'text'
        }
    },
    httpAdapter: {
        read: {
            verb: 'GET',
            path: '/api/V1/model',
            format: 'json',
            headers: {},
            params: {},
            mapping: {}
        },
        create: {

        },
        update: {

        },
        delete: {

        }
    }
};