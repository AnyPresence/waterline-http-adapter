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
    // Not sure if this is where this will live yet or if this is how
    // it will look.
    findTransform: function() {
        // Some logic to transform after a find() call.
    },
    createTransform: function() {
        // Same as above, except for create() call.
    }
};