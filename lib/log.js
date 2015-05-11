module.exports = function(message) {
    if (process.env.NODE_ENV && process.env.NODE_ENV === 'test') return;
    if (typeof sails !== 'undefined') return sails.log.debug(message);
    console.log("debug: " + message);
};