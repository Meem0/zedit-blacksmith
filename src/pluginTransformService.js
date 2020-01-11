ngapp.service('pluginTransformService', function() {
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

    this.ElementToObjectWithShortcuts = function(handle) {
        return addShortcuts(xelib.ElementToObject(handle));
    }

    this.CreateTransformation = function({base, delta}) {
        let baseObject = xelib.WithHandle(
            xelib.GetElement(0, base),
            handle => {
                if (handle === 0) {
                    return;
                }
                return ElementToObjectWithShortcuts(handle);
            }
        );

        if (!baseObject) {
            return;
        }

        let transformedObject = merge(baseObject, delta);
        return transformedObject;
    }

    this.WriteTransformation = function({base, delta}) {
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
    
    const vtUnknown = xelib.valueTypes.indexOf('vtUnknown');
    const vtNumber = xelib.valueTypes.indexOf('vtNumber');
    const vtReference = xelib.valueTypes.indexOf('vtReference');
    const vtFlags = xelib.valueTypes.indexOf('vtFlags');
    const vtEnum = xelib.valueTypes.indexOf('vtEnum');
    const vtArray = xelib.valueTypes.indexOf('vtArray');
    const vtStruct = xelib.valueTypes.indexOf('vtStruct');

    const stInteger = xelib.smashTypes.indexOf('stInteger');
    const stFloat = xelib.smashTypes.indexOf('stFloat');

    let writeIntegerValueToElement = function(id, value) {
        const currentValue = xelib.GetIntValue(id, '');

        if (value !== currentValue) {
            console.log(xelib.Path(id) + ': ' + currentValue + ' -> ' + value);
            xelib.SetIntValue(id, '', value);
        }
        else {
            console.log(xelib.Path(id) + ' == ' + currentValue);
        }
    }

    let writeFloatValueToElement = function(id, value) {
        const currentValue = xelib.GetFloatValue(id, '');
        const tolerance = 0.0001;

        if (Math.abs(value - currentValue) > tolerance) {
            console.log(xelib.Path(id) + ': ' + currentValue + ' -> ' + value);
            xelib.SetFloatValue(id, '', value);
        }
        else {
            console.log(xelib.Path(id) + ': ' + currentValue + ' == ' + value);
        }
    }

    let writeNumberValueToElement = function(id, value) {
        const smashType = xelib.SmashType(id);
        switch (smashType) {
            case stInteger:
                writeIntegerValueToElement(id, value);
                break;
            case stFloat:
                writeFloatValueToElement(id, value);
                break;
            default:
                console.log(xelib.Path(id) + ': unexpected smashType: ' + xelib.smashTypes[smashType]);
                break;
        }
    }

    // reference is of format {plugin name}:{form id without load order}
    let getFormIdFromReference = function(reference) {
        if (reference === 0) {
            return '00000000';
        }

        const [filename, formIdStem] = reference.split(':');
        const loadOrder = xelib.WithHandle(
            xelib.FileByName(filename),
            fileId => xelib.GetFileLoadOrder(fileId)
        );
        const loadOrderString = xelib.Hex(loadOrder, 2);
        return loadOrderString + formIdStem;
    }

    let writeReferenceValueToElement = function(id, referenceValue) {
        const currentValue = xelib.Hex(xelib.GetUIntValue(id, ''), 8);
        const writeValue = getFormIdFromReference(referenceValue);

        if (writeValue !== currentValue) {
            console.log(xelib.Path(id) + ': ' + currentValue + ' -> ' + writeValue);
            xelib.SetValue(id, '', writeValue);
        }
        else {
            console.log(xelib.Path(id) + ' == ' + currentValue);
        }
    }

    let writeFlagValueToElement = function(id, flagValue) {
        const elementEnabledFlags = xelib.GetEnabledFlags(id, '');
        // e.g. flagValue = {"Flag 1": true, "Flag 2": false}, valueEnabledFlags = ["Flag 1"]
        const valueEnabledFlags = Object.entries(flagValue).reduce((enabledFlags, [flagName, flagEnabled]) => {
            if (flagEnabled) {
                enabledFlags.push(flagName);
            }
            return enabledFlags;
        }, []);
        // check if elementEnabledFlags has a flag that is not present or false in flagValue
        const isValueMissingFlags = elementEnabledFlags.some(flag => flagValue[flag] == false);
        if (valueEnabledFlags.length != elementEnabledFlags.length || isValueMissingFlags) {
            console.log(xelib.Path(id) + ': ' + elementEnabledFlags + ' -> ' + valueEnabledFlags);
            xelib.SetEnabledFlags(id, '', valueEnabledFlags);
        }
        else {
            console.log(xelib.Path(id) + ' == ' + elementEnabledFlags);
        }
    }

    let writeEnumValueToElement = function(id, value) {
        const currentValue = xelib.GetValue(id, '');
        const writeValue = xelib.GetEnumOptions(id, '')[value];

        if (!writeValue) return;

        if (writeValue !== currentValue) {
            console.log(xelib.Path(id) + ': ' + currentValue + ' -> ' + writeValue);
            xelib.SetValue(id, '', writeValue);
        }
        else {
            console.log(xelib.Path(id) + ' == ' + currentValue);
        }
    }

    let writeGenericValueToElement = function(id, value) {
        const currentValue = xelib.GetValue(id, '');
        const writeValue = String(value);

        if (writeValue !== currentValue) {
            console.log(xelib.Path(id) + ': ' + currentValue + ' -> ' + writeValue);
            xelib.SetValue(id, '', writeValue);
        }
        else {
            console.log(xelib.Path(id) + ' == ' + currentValue);
        }
    }

    let writeObjectToElementRecursive = function(id, path, obj) {
        for (const [key, value] of Object.entries(obj)) {
            if (key === 'Record Header') {
                continue;
            }

            const childPath = (path.length > 0 ? path + '\\' : '') + key;
            let childId = xelib.GetElement(id, childPath);
            if (childId === 0) {
                childId = xelib.AddElement(id, childPath);
            }
            xelib.WithHandle(
                childId,
                elementId => {
                    const childType = xelib.ValueType(elementId);
                    switch (childType) {
                        case vtUnknown:
                            break;
                        case vtNumber:
                            writeNumberValueToElement(elementId, value);
                            break;
                        case vtReference:
                            writeReferenceValueToElement(elementId, value);
                            break;
                        case vtFlags:
                            writeFlagValueToElement(elementId, value);
                            break;
                        case vtEnum:
                            writeEnumValueToElement(elementId, value);
                            break;
                        case vtArray:
                            break;
                        case vtStruct:
                            console.log('Writing ' + childPath);
                            writeObjectToElementRecursive(id, childPath, value);
                            break;
                        default:
                            writeGenericValueToElement(elementId, value);
                            break;
                    }
                }
            );
        }
    }

    this.WriteObjectToElement = function(id, path, obj) {
        writeObjectToElementRecursive(id, path, obj);
    }
});
