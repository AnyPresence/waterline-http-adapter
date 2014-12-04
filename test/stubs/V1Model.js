module.exports = {
    connection: 'test',
    autoCreatedAt: false,
    autoUpdatedAt: false,
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
            urlParameters: {},
            mapping: {
                'value': '$.outer.inner.value'
            },
            bodyPayloadTemplate: ''
        },
        create: {

        },
        update: {

        },
        delete: {

        }
    }
};