ngapp.service('pluginTransformService', function(
    blacksmithHelpersService,
    recordDependencyService,
    writeObjectToElementService
) {

    let isObject = function(item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }

    let mergeObjects = function(base, delta) {
        for (const key in delta) {
            if (isObject(base[key]) && isObject(delta[key])) {
                mergeObjects(base[key], delta[key]);
            }
            else {
                base[key] = delta[key];
            }
        }
    }

    /*
        Loads the element at basePath into an object, and merges delta onto the object.
    */
    let transformToElementObject = function({basePath, delta}) {
        let baseObject;
        if (basePath === '') {
            baseObject = {};
        }
        else {
            baseObject = xelib.WithHandle(
                xelib.GetElement(0, basePath),
                id => id === 0 ? undefined : xelib.ElementToObject(id)
            );
        }

        if (!baseObject) {
            return;
        }
        
        mergeObjects(baseObject, delta);

        return baseObject;
    }

    let substituteReferences = function(recordObject, substitutions) {
        let recordObjectJson = JSON.stringify(recordObject);
        for (let {from, to} of substitutions) {
            recordObjectJson = recordObjectJson.replace(from, to);
        }
        return JSON.parse(recordObjectJson);
    }

    let writeRecordObjects = function(pluginId, recordObjects) {
        let referenceSubstitutions = [];
        for (let recordObject of recordObjects) {
            const recordObjectSubstituted = substituteReferences(recordObject, referenceSubstitutions);
            xelib.WithHandle(
                writeObjectToElementService.writeObjectToRecord(pluginId, recordObjectSubstituted),
                recordId => {
                    const newRecordFormId = blacksmithHelpersService.getReferenceFromRecord(recordId);
                    if (newRecordFormId) {
                        referenceSubstitutions.push({
                            from: recordObject['Record Header']['FormID'],
                            to: newRecordFormId
                        });
                    }
                    else {
                        blacksmithHelpersService.logWarn('Failed to write record: ' + recordObject['Record Header']['FormID']);
                    }
                }
            );
        }
    }
    
    let addBasePathsToTransforms = function(transforms) {
        for (let transform of transforms) {
            // base = '' is a special case that doesn't need a path
            if (transform.base === '') {
                transform.basePath = '';
                continue;
            }
            const recordPath = blacksmithHelpersService.getPathFromReference(transform.base);
            if (recordPath) {
                transform.basePath = recordPath;
            }
        }
    }
    
    let filterForValidTransforms = function(transforms) {
        return transforms.filter(({base, basePath, delta}) => {
            const validBase =
                basePath === ''
                || (basePath !== undefined
                    && xelib.WithHandle(
                        xelib.GetElement(0, basePath),
                        id => blacksmithHelpersService.isMainRecord(id)
                    )
                );
            if (!validBase) {
                blacksmithHelpersService.logInfo('Skipping transform ' + base + ': cannot find record');
                return false;
            }
            const validDelta = delta && typeof(delta) === 'object' && !Array.isArray(delta);
            if (!validDelta) {
                blacksmithHelpersService.logInfo('Skipping transform ' + base + ': invalid delta');
                return false;
            }
            return true;
        });
    }
    
    // adds property basePath to each transform (e.g. base = 'Skyrim.esm:012E49' -> basePath = 'Skyrim.esm\\00012E49')
    // filters for only transforms that reference valid records
    let processTransformsForWriting = function(transforms) {
        if (!Array.isArray(transforms)) {
            blacksmithHelpersService.logWarn('processTransforms failed: transforms is not an array');
            return [];
        }
        addBasePathsToTransforms(transforms);
        return filterForValidTransforms(transforms);
    }

    this.writeTransforms = function(pluginId, transforms) {
        try {
            const processedTransforms = processTransformsForWriting(transforms);
            const recordObjects = processedTransforms.map(transform => transformToElementObject(transform));
            const allRecordObjects = recordDependencyService.getRecordObjectDependencies(recordObjects);
            writeRecordObjects(pluginId, allRecordObjects);
        }
        catch (ex) {
            blacksmithHelpersService.logWarn('writeTransforms failed: ' + ex, { id: pluginId });
        }
    }
});
