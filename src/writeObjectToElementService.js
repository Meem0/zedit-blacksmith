ngapp.service('writeObjectToElementService', function(blacksmithHelpersService) {
    let getElementValue = function(id, typeInfo) {
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
    };

    let setElementValue = function(id, value, typeInfo) {
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
    };

    let getWriteValue = function(id, value, typeInfo) {
        if (typeInfo.isReference) {
            return blacksmithHelpers.getFormIdFromReference(value);
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
        else {
            return value;
        }
    };

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
    };

    let writeReferencedRecord = function(referenceId, recordObject) {
        return xelib.WithHandle(
            blacksmithHelpers.getFileContainingElement(referenceId),
            fileId => xelib.WithHandle(
                writeObjectToRecordInternal(fileId, recordObject),
                recordId => blacksmithHelpers.getReferenceFromRecord(recordId)
            )
        );
    };

    let writeValueToElement = function(id, value, typeInfo) {
        try {
            if (typeInfo.isReference && typeof(value) === 'object') {
                // special case: instead of a reference string, value is a record object
                // write value as a new record, and get the resulting reference string
                value = writeReferencedRecord(id, value);
            }

            const elementValue = getElementValue(id, typeInfo);
            const writeValue = getWriteValue(id, value, typeInfo);

            if (writeValue === undefined) {
                blacksmithHelpersService.logInfo('Skipped ' + elementValue, { id: id });
            }

            if (!areValuesEqual(elementValue, writeValue, typeInfo)) {
                blacksmithHelpersService.logInfo(elementValue + ' -> ' + writeValue, { id: id });
                setElementValue(id, writeValue, typeInfo);
            }
            else {
                blacksmithHelpersService.logInfo(elementValue + ' == ' + writeValue, { id: id });
            }
        }
        catch (ex) {
            blacksmithHelpers.logWarn('writeValueToElement failed: ' + ex, { id: id });
        }
    };

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
            blacksmithHelpers.logWarn('writeArrayToElement failed: ' + ex, { id: id });
        }
    };

    // path must be a direct child of id
    let getOrAddElement = function(id, path) {
        let childId = 0;
        try {
            childId = xelib.GetElement(id, path);
            if (childId === 0) {
                if (blacksmithHelpers.isArray(id)) {
                    childId = xelib.AddArrayItem(id, '', '', '');
                    blacksmithHelpersService.logInfo('Added array item at ' + path, { id: childId });
                }
                else {
                    const pathToUse = path.startsWith('BODT') ? 'BOD2' : path;
                    childId = xelib.AddElement(id, pathToUse);
                    blacksmithHelpersService.logInfo('Added element at ' + pathToUse, { id: childId });
                }
            }
        }
        catch (ex) {
            // AddElement might fail if we try to add an array count element
            // there doesn't seem to be a way to check this beforehand
            if (childId !== 0) {
                blacksmithHelpers.logWarn('Could not add element at ' + path, { id: childId });
            }
        }
        finally {
            if (childId === 0) {
                blacksmithHelpers.logWarn('Could not get or add element at ' + path);
            }
        }
        return childId;
    };

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
                    const typeInfo = blacksmithHelpers.getTypeInfo(elementId);
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
                        blacksmithHelpers.logWarn('Unknown value type at ' + key, { id: elementId });
                    }
                }
            );
        }
    };

    let writeObjectToRecordInternal = function(pluginId, recordObject) {
        const signature = blacksmithHelpers.getRecordObjectSignature(recordObject);
        if (!signature) {
            blacksmithHelpers.logWarn('writeObjectToRecordInternal: recordObject has no signature', {id: pluginId});
            return 0;
        }

        if (recordObject.reference) {
            // we already wrote this recordObject!
            return blacksmithHelpers.getRecordFromReference(recordObject.reference);
        }

        const recordId = getOrAddElement(pluginId, signature + '\\' + signature)
        writeObjectToElementRecursive(recordId, recordObject);

        // make a "note" that we wrote this recordObject to a record
        const reference = blacksmithHelpers.getReferenceFromRecord(recordId);
        if (reference) {
            recordObject.reference = reference;
        }

        return recordId;
    };
    
    this.writeObjectToElement = writeObjectToElementRecursive;
    this.writeObjectToRecord = writeObjectToRecordInternal;
});
