/* Wrapper object to let us treat localStorage stuff as JSON objects
 * This *should* make it easier to store arrays and the like and move us away
 * from being Chrome only...
 */
var Settings = {
    get: function(name) {
        if (this.has(name)) {
            return JSON.parse(window.localStorage.getItem(name));
        }
        else {
            return null;
        }
    },
    set: function(name, value) {
        window.localStorage.setItem(name, JSON.stringify(value));
    },
    del: function(name){
        window.localStorage.removeKey(name);
    },
    has: function(name) {
        return name in window.localStorage && window.localStorage[name] !== null;
    },
    keys: function() {
        // okay, this is cheating, but it works :)
        return window.localStorage;
    }
};