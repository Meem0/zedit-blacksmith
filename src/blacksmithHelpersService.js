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

    const vtUnknown = xelib.valueTypes.indexOf('vtUnknown');
    const vtNumber = xelib.valueTypes.indexOf('vtNumber');
    const vtReference = xelib.valueTypes.indexOf('vtReference');
    const vtFlags = xelib.valueTypes.indexOf('vtFlags');
    const vtEnum = xelib.valueTypes.indexOf('vtEnum');
    const vtArray = xelib.valueTypes.indexOf('vtArray');
    const vtStruct = xelib.valueTypes.indexOf('vtStruct');

    const stInteger = xelib.smashTypes.indexOf('stInteger');
    const stFloat = xelib.smashTypes.indexOf('stFloat');
    const stUnsortedArray = xelib.smashTypes.indexOf('stUnsortedArray');
    const stUnsortedStructArray = xelib.smashTypes.indexOf('stUnsortedStructArray');
    const stSortedArray = xelib.smashTypes.indexOf('stSortedArray');
    const stSortedStructArray = xelib.smashTypes.indexOf('stSortedStructArray');

    this.blacksmithTypes = {
        btUnknown: 0,
        btFile: 1,
        btMainRecord: 2,
        btStruct: 3,
        btArray: 4,
        btReference: 5,
        btInteger: 6,
        btFloat: 7,
        btFlags: 8
    };

    this.BlacksmithType = function(id) {
        try {
            if (!id) {
                return this.blacksmithTypes.btUnknown;
            }
            const elementType = xelib.ElementType(id);
            if (elementType === etFile) {
                return this.blacksmithTypes.btFile;
            }
            else if (elementType === etMainRecord) {
                return this.blacksmithTypes.btMainRecord;
            }
            const valueType = xelib.ValueType(id);
            if (valueType === vtReference) {
                return this.blacksmithTypes.btReference;
            }
        }
        catch(ex) {
            this.logError('BlacksmithType failed for id ' + id);
        }
        return this.blacksmithTypes.btUnknown;
    };

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
