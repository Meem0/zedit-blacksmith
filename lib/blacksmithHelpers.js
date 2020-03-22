let blacksmithHelpers = {};

let isValidElementInternal = function(id) {
    return typeof(id) === 'number' && id > 0 && xelib.HasElement(id, '');
};

blacksmithHelpers.isValidElement = isValidElementInternal;

let getLogElementName = function(id) {
    let elementName = '';
    try {
        if (isValidElementInternal(id)) {
            elementName = xelib.LongName(id);
            if (elementName.length > 0) {
                elementName = '(' + elementName + ') ';
            }
        }
    }
    catch (ex) {
        // swallow error
    }
    return elementName;
};

let getLogString = function(msg, opts = {}) {
    const pathStr = getLogElementName(opts.id);
    return '[BLACKSMITH] ' + pathStr + msg;
};

blacksmithHelpers.logInfo = function(msg, opts = {}) {
    logger.info(getLogString(msg, opts));
};

blacksmithHelpers.logWarn = function(msg, opts = {}) {
    logger.warn(getLogString(msg, opts));
};

blacksmithHelpers.logError = function(msg, opts = {}) {
    logger.error(getLogString(msg, opts));
};

const etFile = xelib.elementTypes.indexOf('etFile');
const etMainRecord = xelib.elementTypes.indexOf('etMainRecord');
const etGroupRecord = xelib.elementTypes.indexOf('etGroupRecord');

const vtNumber = xelib.valueTypes.indexOf('vtNumber');
const vtArray = xelib.valueTypes.indexOf('vtArray');
const vtStruct = xelib.valueTypes.indexOf('vtStruct');
const vtReference = xelib.valueTypes.indexOf('vtReference');
const vtFlags = xelib.valueTypes.indexOf('vtFlags');

const stUnknown = xelib.smashTypes.indexOf('stUnknown');
const stInteger = xelib.smashTypes.indexOf('stInteger');
const stFloat = xelib.smashTypes.indexOf('stFloat');
const stUnion = xelib.smashTypes.indexOf('stUnion');

const blacksmithTypes = {
    btUnknown: 0,
    btFile: 1,
    btMainRecord: 2,
    btGroup: 3,
    btHeader: 4,
    btStruct: 5,
    btArray: 6,
    btReference: 7,
    btInteger: 8,
    btFloat: 9,
    btFlags: 10,
    btOther: 11
};

let BlacksmithType = function(id) {
    if (!isValidElementInternal(id)) {
        return blacksmithTypes.btUnknown;
    }
    try {
        const elementType = xelib.ElementType(id);
        if (elementType === etFile) {
            return blacksmithTypes.btFile;
        }
        else if (elementType === etMainRecord) {
            const elementName = xelib.Name(id);
            if (elementName === 'Record Header' || elementName === 'File Header') {
                return blacksmithTypes.btHeader;
            }
            return blacksmithTypes.btMainRecord;
        }
        else if (elementType === etGroupRecord) {
            return blacksmithTypes.btGroup;
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
        const smashType = xelib.SmashType(id);
        if (smashType === stInteger) {
            return blacksmithTypes.btInteger;
        }
        else if (smashType === stFloat) {
            return blacksmithTypes.btFloat;
        }
        else if (smashType === stUnion && valueType === vtNumber) {
            const valueStr = xelib.GetValue(id);
            return valueStr.includes('.') ? blacksmithTypes.btFloat : blacksmithTypes.btInteger;
        }
        else if (smashType !== stUnknown) {
            return blacksmithTypes.btOther;
        }
    }
    catch (ex) {
        logger.error(getLogString('BlacksmithType failed!', { id: id }));
    }
    return blacksmithTypes.btUnknown;
};

blacksmithHelpers.getTypeInfo = function(id) {
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
        get isGroup() {
            return this.type === blacksmithTypes.btGroup;
        },
        get isHeader() {
            return this.type === blacksmithTypes.btHeader;
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
        get isNumber() {
            return this.isInteger || this.isFloat;
        }
    };
};

blacksmithHelpers.isFile = function(id) {
    return blacksmithHelpers.getTypeInfo(id).isFile;
};

blacksmithHelpers.isMainRecord = function(id) {
    return blacksmithHelpers.getTypeInfo(id).isMainRecord;
};

blacksmithHelpers.isHeader = function(id) {
    return blacksmithHelpers.getTypeInfo(id).isHeader;
};

blacksmithHelpers.isArray = function(id) {
    return blacksmithHelpers.getTypeInfo(id).isArray;
};

blacksmithHelpers.isReference = function(id) {
    return blacksmithHelpers.getTypeInfo(id).isReference;
};

blacksmithHelpers.getFileNameAndFormIdFromReference = function(reference) {
    if (reference && typeof(reference) === 'string') {
        const [filename, formIdStem] = reference.split(':');
        if (filename && formIdStem) {
            try {
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
            catch (ex) {
                // swallow errors, we'll return {}
            }
        }
    }

    return {};
};

// e.g. 'Skyrim.esm:012E49' -> '00012E49'
blacksmithHelpers.getFormIdFromReference = function(reference) {
    const { formId } = blacksmithHelpers.getFileNameAndFormIdFromReference(reference);
    return formId ? formId : '00000000';
};

// e.g. 'Skyrim.esm:012E49' -> 'Skyrim.esm\\00012E49'
blacksmithHelpers.getPathFromReference = function(reference) {
    const { filename, formId } = blacksmithHelpers.getFileNameAndFormIdFromReference(reference);
    return filename && formId ? filename + '\\' + formId : '';
};

blacksmithHelpers.getFileContainingElement = function(elementId) {
    if (!blacksmithHelpers.isValidElement(elementId)) {
        return 0;
    }

    let findParentFile = id => {
        if (id === 0) {
            return 0;
        }
        if (blacksmithHelpers.isFile(id)) {
            // duplicate handle so it isn't freed by caller
            return xelib.GetElement(id, '');
        }
        return xelib.WithHandle(
            xelib.GetContainer(id),
            parentId => findParentFile(parentId)
        );
    };

    return findParentFile(elementId);
};

blacksmithHelpers.getFilenameContainingElement = function(elementId) {
    return xelib.WithHandle(
        blacksmithHelpers.getFileContainingElement(elementId),
        fileId => fileId ? xelib.Name(fileId) : ''
    );
};

blacksmithHelpers.getRecordFromLongName = function(longName) {
    if (typeof(longName) !== 'string') {
        return 0;
    }
    const idxStart = longName.lastIndexOf('[');
    const idxEnd = longName.lastIndexOf(']');
    if (idxStart < 0 || idxEnd < 0) {
        return 0;
    }
    const sigAndFormId = longName.substring(idxStart + 1, idxEnd);
    const formIdStr = sigAndFormId.substring(sigAndFormId.lastIndexOf(':') + 1);
    const formId = Number.parseInt(formIdStr, 16) || 0;
    return xelib.GetRecord(0, formId);
};

// e.g. (handle to 00012E49) -> 'Skyrim.esm:012E49'
blacksmithHelpers.getReferenceFromRecord = function(recordId) {
    if (blacksmithHelpers.isMainRecord(recordId)) {
        const localFormId = xelib.GetHexFormID(recordId, /*native*/ true, /*local*/ true);
        const filename = blacksmithHelpers.getFilenameContainingElement(recordId);
        return filename + ':' + localFormId;
    }
    return '';
};

// e.g. 'Skyrim.esm:012E49' -> (handle to 00012E49)
blacksmithHelpers.getRecordFromReference = function(reference) {
    const path = blacksmithHelpers.getPathFromReference(reference);
    if (path) {
        return xelib.GetElement(0, path);
    }
    return 0;
};

blacksmithHelpers.runOnReferenceRecord = function(reference, func, ...args) {
    return xelib.WithHandle(
        blacksmithHelpers.getRecordFromReference(reference),
        id => id ? func(id, ...args) : null
    );
};

blacksmithHelpers.getRecordObjectSignature = function(recordObject) {
    if (typeof(recordObject) === 'object') {
        const recordHeader = recordObject['Record Header'];
        if (typeof(recordHeader) === 'object') {
            const signature = recordHeader.Signature;
            if (typeof(signature === 'string')) {
                return signature;
            }
        }
    }
    return '';
};

blacksmithHelpers.findElementInFiles = function(path) {
    let itemId = 0;
    xelib.WithHandles(
        xelib.GetElements(0, ''),
        fileIds => {
            for (const fileId of fileIds) {
                itemId = xelib.GetElement(fileId, path);
                if (itemId) {
                    break;
                }
            }
        }
    );
    return itemId;
};

let forEachElementRecursive = function(id, leafFunc, opts) {
    if (!isValidElementInternal(id) && id !== 0) {
        return;
    }

    let runLeafFunc = true;
    if (xelib.ElementCount(id) > 0) {
        if (opts.containerPred(id)) {
            let children = [];
            xelib.WithEachHandle(
                xelib.GetElements(id),
                childId => {
                    const childValue = forEachElementRecursive(childId, leafFunc, opts);
                    if (childValue !== undefined) {
                        children.push(childValue);
                    }
                }
            );
            return opts.containerFunc(id, children);
        }
        runLeafFunc = opts.runLeafFuncOnSkippedContainers;
    }
    if (runLeafFunc) {
        return leafFunc(id);
    }
};

const defaultOpts = {
    containerPred: id => true,
    containerFunc: (id, children) => undefined,
    runLeafFuncOnSkippedContainers: false
};

blacksmithHelpers.forEachElement = function(id, leafFunc, opts = defaultOpts) {
    return forEachElementRecursive(id, leafFunc, Object.assign({}, defaultOpts, opts));
};

let arrayOfObjectsToObject = function(array) {
    return Object.assign({}, ...array);
};

blacksmithHelpers.elementToObject = function(elementId) {
    let formatContainer = (containerId, children) => {
        if (!children) {
            return;
        }
        
        const containerTypeInfo = blacksmithHelpers.getTypeInfo(containerId);
        const key = xelib.Name(containerId);
        let value;
        if (containerTypeInfo.isArray) {
            const canRemoveKeys = children.every(child => typeof(child) === 'object' && !Array.isArray(child) && Object.keys(child).length === 1);
            if (canRemoveKeys) {
                value = children.map(child => Object.values(child)[0]);
            }
            else {
                value = children;
            }
        }
        else {
            value = arrayOfObjectsToObject(children);
        }

        if (containerTypeInfo.isMainRecord) {
            return value;
        }

        return { [key]: value };
    };

    let getElementValue = (id) => {
        if (blacksmithHelpers.isReference(id)) {
            return xelib.WithHandle(
                xelib.GetLinksTo(id),
                linksToId => {
                    if (!linksToId) {
                        return 0;
                    }
                    const formId = xelib.GetHexFormID(linksToId);
                    const loadOrder = Number.parseInt(formId.substring(0, 2));
                    const filename = xelib.WithHandle(
                        xelib.FileByLoadOrder(loadOrder),
                        fileId => xelib.GetFileName(fileId)
                    );
                    const localFormId = formId.substring(2);
                    return { [xelib.Name(id)]: filename + ':' + localFormId };
                }
            );
        }
        return xelib.ElementToObject(id);
    };

    const typeInfo = blacksmithHelpers.getTypeInfo(elementId);
    if (!blacksmithHelpers.isValidElement(elementId) || typeInfo.isFile || typeInfo.isGroup) {
        blacksmithHelpers.logWarn('elementToObject called on unsupported element type', { id: elementId });
        return {};
    }

    return blacksmithHelpers.forEachElement(
        elementId,
        getElementValue,
        {
            containerFunc: formatContainer
        }
    );
};

module.exports = blacksmithHelpers;
