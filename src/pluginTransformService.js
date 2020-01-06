ngapp.service('pluginTransformService', function() {
    let convertKeyName = function(keyName) {
        let keyNameParts = keyName.split(' - ');
        let keyNamePart = (keyNameParts.length == 2 && keyNameParts[1].length > 0) ? keyNameParts[1] : keyNameParts[0];
        return keyNamePart.replace(' ', '');
    }

    let addShortcuts = function(obj) {
        if (typeof(obj) !== 'object') return;

        if (obj.constructor === Array) {
            for (let elem of obj) {
                addShortcuts(elem);
            }
            return;
        }

        for (let key in obj) {
            if (!obj.hasOwnProperty(key)) continue;
            let keyAlias = convertKeyName(key);
            if (!obj.hasOwnProperty(keyAlias)) {
                Object.defineProperty(obj, keyAlias, {
                    get () {
                        return this[key];
                    },
                    set (value) {
                        this[key] = value;
                    }
                });
            }
            addShortcuts(obj[key]);
        }

        return obj;
    }

    this.ElementToObjectWithShortcuts = function(handle) {
        return addShortcuts(xelib.ElementToObject(handle));
    }
});
