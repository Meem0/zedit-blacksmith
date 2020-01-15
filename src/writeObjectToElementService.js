ngapp.service('writeObjectToElementService', function(blacksmithHelpersService) {
    let getRecordValue = function(id, typeInfo) {
        if (typeInfo.isInteger) {
            return xelib.GetIntValue(id, '');
        }
        else if (typeInfo.isFloat) {
            return xelib.GetFloatValue(id, '');
        }
        else if (typeInfo.isReference) {
            return xelib.Hex(xelib.GetUIntValue(id, ''), 8);
        }
        else if (typeInfo.isFlags) {
            // GetEnabledFlags returns [""] if no enabled flags, we want []
            return xelib.GetEnabledFlags(id, '').filter(flag => flag.length > 0);
        }
        else {
            return xelib.GetValue(id, '');
        }
    }

    let writeValueToRecord = function(id, value, typeInfo) {
        if (typeInfo.isInteger) {
            xelib.SetIntValue(id, '', value);
        }
        else if (typeInfo.isFloat) {
            xelib.SetFloatValue(id, '', value);
        }
        else if (typeInfo.isFlags) {
            xelib.SetEnabledFlags(id, '', value);
        }
        else {
            xelib.SetValue(id, '', value);
        }
    }

    let getWriteValue = function(id, value, typeInfo) {
        if (typeInfo.isReference) {
            return blacksmithHelpersService.getFormIdFromReference(value);
        }
        else if (typeInfo.isFlags) {
            // e.g. value = {"Flag 1": true, "Flag 2": false}, return = ["Flag 1"]
            return Object.entries(value).reduce((enabledFlags, [flagName, flagEnabled]) => {
                if (flagEnabled) {
                    enabledFlags.push(flagName);
                }
                return enabledFlags;
            }, []);
        }
        else if (typeInfo.isEnum) {
            return xelib.GetEnumOptions(id, '')[value];
        }
        else {
            return value;
        }
    }

    let areValuesEqual = function(recordValue, writeValue, typeInfo) {
        if (typeInfo.isNumber) {
            const tolerance = 0.0001;
            return Math.abs(recordValue - writeValue) < tolerance;
        }
        else if (typeInfo.isFlags) {
            return recordValue.length === writeValue.length && recordValue.every(recordFlag => writeValue.includes(recordFlag));
        }
        else {
            return recordValue === writeValue;
        }
    }

    let writeValueToElement = function(id, value, typeInfo) {
        try {
            const recordValue = getRecordValue(id, typeInfo);
            const writeValue = getWriteValue(id, value, typeInfo);

            if (writeValue === undefined) {
                console.log(xelib.Path(id) + ': skipped' + recordValue);
            }

            if (!areValuesEqual(recordValue, writeValue, typeInfo)) {
                console.log(xelib.Path(id) + ': ' + recordValue + ' -> ' + writeValue);
                writeValueToRecord(id, writeValue, typeInfo);
            }
            else {
                console.log(xelib.Path(id) + ': ' + recordValue + ' == ' + writeValue);
            }
        }
        catch (ex) {
            blacksmithHelpersService.logWarn('writeValueToElement failed: ' + ex);
        }
    }

    let writeArrayToElement = function(id, path, value) {
        try {
            xelib.RemoveElement(id, path);
            const arrayObj = value.reduce(
                (obj, elem, idx) => {
                    obj['[' + idx + ']'] = elem;
                    return obj;
                },
                {}
            );
            xelib.WithHandle(
                xelib.AddElement(id, path),
                arrayId => writeObjectToElementRecursive(arrayId, arrayObj)
            );
        }
        catch (ex) {
            blacksmithHelpersService.logWarn('writeArrayToElement failed: ' + ex);
        }
    }

    // path must be a direct child of id
    let getOrAddElement = function(id, path) {
        let childId = 0;
        try {
            childId = xelib.GetElement(id, path);
            if (childId === 0) {
                if (blacksmithHelpersService.isArray(id)) {
                    childId = xelib.AddArrayItem(id, '');
                    blacksmithHelpersService.logInfo(xelib.Path(childId) + ': added array item at ' + path);
                }
                else {
                    const pathToUse = path.startsWith('BODT') ? 'BOD2' : path;
                    childId = xelib.AddElement(id, pathToUse);
                    blacksmithHelpersService.logInfo(xelib.Path(childId) + ': added element at ' + pathToUse);
                }
            }
        }
        catch (ex) {
            // AddElement might fail if we try to add an array count element
            // there doesn't seem to be a way to check this beforehand
            blacksmithHelpersService.logWarn('getOrAddElement failed: ' + ex);
        }
        finally {
            if (childId === 0) {
                blacksmithHelpersService.logWarn('Could not get or add element at ' + path);
            }
        }
        return childId;
    }

    let writeObjectToElementRecursive = function(id, obj) {
        if (!obj || typeof(obj) !== 'object' || Array.isArray(obj)) {
            return;
        }
        
        for (const [key, value] of Object.entries(obj)) {
            if (key === 'Record Header') {
                continue;
            }

            const childId = getOrAddElement(id, key);

            if (childId === 0) {
                continue;
            }

            xelib.WithHandle(
                childId,
                elementId => {
                    const typeInfo = blacksmithHelpersService.getTypeInfo(elementId);
                    if (typeInfo.isArray) {
                        writeArrayToElement(id, key, value);
                    }
                    else if (typeInfo.isStruct) {
                        writeObjectToElementRecursive(elementId, value);
                    }
                    else if (!typeInfo.isUnknown) {
                        writeValueToElement(elementId, value, typeInfo);
                    }
                    else {
                        blacksmithHelpersService.logWarn('Unknown value type at ' + path);
                    }
                }
            );
        }
    }

    this.writeObjectToElement = function(id, elementObject) {
        writeObjectToElementRecursive(id, elementObject);
    }
    
    this.writeObjectToRecord = function(pluginId, recordObject) {
        const signature = recordObject['Record Header']['Signature'];
        const recordId = getOrAddElement(pluginId, signature + '\\' + signature)
        this.writeObjectToElement(recordId, recordObject);
        return recordId;
    }
});
