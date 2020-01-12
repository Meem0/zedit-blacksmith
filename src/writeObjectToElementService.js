ngapp.service('writeObjectToElementService', function() {
    const vtUnknown = xelib.valueTypes.indexOf('vtUnknown');
    const vtNumber = xelib.valueTypes.indexOf('vtNumber');
    const vtReference = xelib.valueTypes.indexOf('vtReference');
    const vtFlags = xelib.valueTypes.indexOf('vtFlags');
    const vtEnum = xelib.valueTypes.indexOf('vtEnum');
    const vtArray = xelib.valueTypes.indexOf('vtArray');
    const vtStruct = xelib.valueTypes.indexOf('vtStruct');

    const stInteger = xelib.smashTypes.indexOf('stInteger');
    const stFloat = xelib.smashTypes.indexOf('stFloat');

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

    let getRecordValue = function(id, valueType) {
        switch (valueType) {
            case vtNumber:
                const smashType = xelib.SmashType(id);
                if (smashType === stInteger) {
                    return xelib.GetIntValue(id, '');
                }
                else if (smashType === stFloat) {
                    return xelib.GetFloatValue(id, '');
                }
                else {
                    return 0;
                }
            case vtReference:
                return xelib.Hex(xelib.GetUIntValue(id, ''), 8);
            case vtFlags:
                // GetEnabledFlags returns [""] if no enabled flags, we want []
                return xelib.GetEnabledFlags(id, '').filter(flag => flag.length > 0);
            default:
                return xelib.GetValue(id, '');
        }
    }

    let writeValueToRecord = function(id, value, valueType) {
        switch (valueType) {
            case vtNumber:
                const smashType = xelib.SmashType(id);
                if (smashType === stInteger) {
                    xelib.SetIntValue(id, '', value);
                }
                else if (smashType === stFloat) {
                    xelib.SetFloatValue(id, '', value);
                }
                break;
            case vtFlags:
                xelib.SetEnabledFlags(id, '', value);
                break;
            default:
                xelib.SetValue(id, '', value);
                break;
        }
    }

    let getWriteValue = function(id, value, valueType) {
        switch (valueType) {
            case vtReference:
                return getFormIdFromReference(value);
            case vtFlags:
                // e.g. value = {"Flag 1": true, "Flag 2": false}, return = ["Flag 1"]
                return Object.entries(value).reduce((enabledFlags, [flagName, flagEnabled]) => {
                    if (flagEnabled) {
                        enabledFlags.push(flagName);
                    }
                    return enabledFlags;
                }, []);
            case vtEnum:
                return xelib.GetEnumOptions(id, '')[value];
            default:
                return value;
        }
    }

    let areValuesEqual = function(recordValue, writeValue, valueType) {
        if (valueType === vtNumber) {
            const tolerance = 0.0001;
            return Math.abs(recordValue - writeValue) < tolerance;
        }
        else if (valueType === vtFlags) {
            return recordValue.length === writeValue.length && recordValue.every(recordFlag => writeValue.includes(recordFlag));
        }
        else {
            return recordValue === writeValue;
        }
    }

    let writeValueToElement = function(id, value, valueType) {
        const recordValue = getRecordValue(id, valueType);
        const writeValue = getWriteValue(id, value, valueType);

        if (writeValue === undefined) {
            console.log(xelib.Path(id) + ': skipped' + recordValue);
        }

        if (!areValuesEqual(recordValue, writeValue, valueType)) {
            console.log(xelib.Path(id) + ': ' + recordValue + ' -> ' + writeValue);
            writeValueToRecord(id, writeValue, valueType);
        }
        else {
            console.log(xelib.Path(id) + ': ' + recordValue + ' == ' + writeValue);
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
                        case vtArray:
                            break;
                        case vtStruct:
                            writeObjectToElementRecursive(id, childPath, value);
                            break;
                        default:
                            writeValueToElement(elementId, value, childType);
                            break;
                    }
                }
            );
        }
    }

    this.writeObjectToElement = function(id, path, obj) {
        writeObjectToElementRecursive(id, path, obj);
    }
});
