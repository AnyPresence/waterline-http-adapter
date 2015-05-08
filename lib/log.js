module.exports = function(message) {
    if (typeof sails !== 'undefined') return sails.log.debug(message);
    console.log("debug: " + message);
};