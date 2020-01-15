ngapp.service('blacksmithHelpersService', function() {
    this.logInfo = function(msg) {
        logger.info('[BLACKSMITH] ' + msg);
    }

    this.logWarn = function(msg) {
        logger.warn('[BLACKSMITH] ' + msg);
    }

    this.logError = function(msg) {
        logger.error('[BLACKSMITH] ' + msg);
    }

    const etFile = xelib.elementTypes.indexOf('etFile');
    const etMainRecord = xelib.elementTypes.indexOf('etMainRecord');

    const vtArray = xelib.valueTypes.indexOf('vtArray');
    const vtStruct = xelib.valueTypes.indexOf('vtStruct');
    const vtReference = xelib.valueTypes.indexOf('vtReference');
    const vtFlags = xelib.valueTypes.indexOf('vtFlags');
    const vtEnum = xelib.valueTypes.indexOf('vtEnum');

    const stInteger = xelib.smashTypes.indexOf('stInteger');
    const stFloat = xelib.smashTypes.indexOf('stFloat');

    const blacksmithTypes = {
        btUnknown: 0,
        btFile: 1,
        btMainRecord: 2,
        btStruct: 3,
        btArray: 4,
        btReference: 5,
        btInteger: 6,
        btFloat: 7,
        btFlags: 8,
        btEnum: 9
    };

    let BlacksmithType = function(id) {
        try {
            if (!id) {
                return blacksmithTypes.btUnknown;
            }
            const elementType = xelib.ElementType(id);
            if (elementType === etFile) {
                return blacksmithTypes.btFile;
            }
            else if (elementType === etMainRecord) {
                return blacksmithTypes.btMainRecord;
            }
            const valueType = xelib.ValueType(id);
            if (valueType === vtArray) {
                return blacksmithTypes.btArray;
            }
            else if (valueType === vtStruct) {
                return blacksmithTypes.btStruct;
            }
            else if (valueType === vtReference) {
                return blacksmithTypes.btReference;
            }
            else if (valueType === vtFlags) {
                return blacksmithTypes.btFlags;
            }
            else if (valueType === vtEnum) {
                return blacksmithTypes.btEnum;
            }
            const smashType = xelib.SmashType(id);
            if (smashType === stInteger) {
                return blacksmithTypes.btInteger;
            }
            else if (smashType === stFloat) {
                return blacksmithTypes.btFloat;
            }
        }
        catch(ex) {
            this.logError('BlacksmithType failed for id ' + id);
        }
        return blacksmithTypes.btUnknown;
    };
    
    this.getTypeInfo = function(id) {
        return {
            type: BlacksmithType(id),
            get isUnknown() {
                return this.type === blacksmithTypes.btUnknown;
            },
            get isFile() {
                return this.type === blacksmithTypes.btFile;
            },
            get isMainRecord() {
                return this.type === blacksmithTypes.btMainRecord;
            },
            get isStruct() {
                return this.type === blacksmithTypes.btStruct;
            },
            get isArray() {
                return this.type === blacksmithTypes.btArray;
            },
            get isReference() {
                return this.type === blacksmithTypes.btReference;
            },
            get isInteger() {
                return this.type === blacksmithTypes.btInteger;
            },
            get isFloat() {
                return this.type === blacksmithTypes.btFloat;
            },
            get isFlags() {
                return this.type === blacksmithTypes.btFlags;
            },
            get isEnum() {
                return this.type === blacksmithTypes.btEnum;
            }
        };
    }
    
    this.isMainRecord = function(id) {
        return getTypeInfo(id).isMainRecord;
    }
    
    this.isArray = function(id) {
        return getTypeInfo(id).isArray;
    }
    
    this.isReference = function(id) {
        return getTypeInfo(id).isReference;
    }
    
    let getFileNameAndFormIdFromReference = function(reference) {
        if (reference && typeof(reference) === 'string') {
            const [filename, formIdStem] = reference.split(':');
            if (filename && formIdStem) {
                const loadOrder = xelib.WithHandle(
                    xelib.FileByName(filename),
                    fileId => fileId ? xelib.GetFileLoadOrder(fileId) : -1
                );
                if (loadOrder >= 0) {
                    const loadOrderString = xelib.Hex(loadOrder, 2);
                    const formId = loadOrderString + formIdStem;
                    return { filename: filename, formId: formId };
                }
            }
        }

        return {};
    }

    // e.g. 'Skyrim.esm:012E49' -> '00012E49'
    this.getFormIdFromReference = function(reference) {
        const { formId } = getFileNameAndFormIdFromReference(reference);
        return formId ? formId : '00000000';
    }

    // e.g. 'Skyrim.esm:012E49' -> 'Skyrim.esm\\00012E49'
    this.getPathFromReference = function(reference) {
        const { filename, formId } = getFileNameAndFormIdFromReference(reference);
        return filename && formId ? filename + '\\' + formId : '';
    }
});
