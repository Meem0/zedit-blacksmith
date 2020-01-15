ngapp.service('blacksmithHelpersService', function() {
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

    this.logInfo = function(msg) {
        logger.info('[BLACKSMITH] ' + msg);
    }

    this.logWarn = function(msg) {
        logger.warn('[BLACKSMITH] ' + msg);
    }
});
