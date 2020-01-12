ngapp.service('pluginTransformService', function(writeObjectToElementService) {
    let merge = require('lodash.merge');

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

    this.elementToObjectWithShortcuts = function(handle) {
        return addShortcuts(xelib.ElementToObject(handle));
    }

    this.createTransformation = function({base, delta}) {
        let baseObject = xelib.WithHandle(
            xelib.GetElement(0, base),
            handle => {
                if (handle === 0) {
                    return;
                }
                return elementToObjectWithShortcuts(handle);
            }
        );

        if (!baseObject) {
            return;
        }

        let transformedObject = merge(baseObject, delta);
        return transformedObject;
    }

    this.writeTransformation = function({base, delta}) {
        return xelib.WithHandle(
            () => {
                let handle = xelib.GetElement(0, base);
                if (handle === 0) {
                    handle = xelib.AddElement(0, base);
                }
                return handle;
            },
            handle => {
                writeObjectToRecord(delta, handle, '');
            }
        );
    }
});
