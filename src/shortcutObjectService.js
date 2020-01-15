ngapp.service('shortcutObjectService', function() {
    let convertKeyName = function(keyName) {
        let [keyNamePart] = keyName.split(' - ');
        return keyNamePart.replace(' ', '');
    }

    let addShortcutsRecursive = function(obj) {
        if (typeof(obj) !== 'object') return;

        if (Array.isArray(obj)) {
            for (let elem of obj) {
                addShortcutsRecursive(elem);
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
            addShortcutsRecursive(obj[key]);
        }

        return obj;
    }

    // e.g. if obj has keys "Record Header" and "EDID - Editor ID", adds getters for those properties, RecordHeader and EDID
    this.addShortcuts = function(obj) {
        return addShortcutsRecursive(obj);
    }
});
