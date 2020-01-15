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
        Loads the element at path base into an object, and merges delta onto the object.
    */
    let transformToElementObject = function({base, delta}) {
        let baseObject = xelib.WithHandle(
            xelib.GetElement(0, base),
            id => id === 0 ? undefined : xelib.ElementToObject(id)
        );

        if (!baseObject) {
            return;
        }
        
        mergeObjects(baseObject, delta);

        return baseObject;
    }

    /*
        Returns an array that includes every entry in transforms,
        as well as new entries that the entires of transforms are dependent on.
        Dependencies occur before dependees.

        e.g.
        transforms = [
            {
                base: CoolSword.esp\\01000001, // form ID of a WEAP
                delta: { ... }
            }
        ]
        return = [
            {
                base: CoolSword.esp\\01000002, // form ID of a STAT that 01000002 references
                delta: {}
            },
            {
                base: CoolSword.esp\\01000001, // form ID of a WEAP
                delta: { ... }
            }
        ]
    */
    let addDependenciesToTransformList = function(transforms) {
        const basePaths = transforms.map(transform => transform.base);
        const recordDependencies = recordDependencyService.getDependencies(basePaths);
        return recordDependencies.map(recordPath => {
            const associatedTransform = transforms.find(transform => transform.base === recordPath);
            return {
                base: recordPath,
                delta: associatedTransform ? associatedTransform.delta : {}
            };
        });
    }

    let substituteReferences = function(recordObject, substitutions) {
        let recordObjectJson = JSON.stringify(recordObject);
        for (let {from, to} of substitutions) {
            recordObjectJson = recordObjectJson.replace(from, to);
        }
        return JSON.parse(recordObjectJson);
    }

    let getReferenceFromRecord = function(recordId) {
        if (recordId) {
            const localFormId = xelib.GetHexFormID(recordId, /*native*/ true, /*local*/ true);
            const recordPath = xelib.Path(recordId);
            const [filename] = recordPath.split('\\');
            return filename + ':' + localFormId;
        }
        return '';
    }

    let writeRecordObjects = function(pluginId, recordObjects) {
        let referenceSubstitutions = [];
        for (let recordObject of recordObjects) {
            const recordObjectSubstituted = substituteReferences(recordObject, referenceSubstitutions);
            xelib.WithHandle(
                writeObjectToElementService.writeObjectToRecord(pluginId, recordObjectSubstituted),
                recordId => {
                    const newRecordFormId = getReferenceFromRecord(recordId);
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

    // converts each transform.base from 'Skyrim.esm:012E49' -> 'Skyrim.esm\\00012E49'
    // filters for only transforms that reference valid records
    let processTransforms = function(transforms) {
        if (!Array.isArray(transforms)) {
            blacksmithHelpersService.logInfo('processTransforms failed: transforms is not an array');
            return [];
        }
        for (let transform of transforms) {
            transform.base = blacksmithHelpersService.getPathFromReference(transform.base);
        }
        return transforms.filter(({base, delta}) => {
            const validBase = xelib.WithHandle(
                xelib.GetElement(0, base),
                id => blacksmithHelpersService.BlacksmithType(id) === blacksmithHelpersService.blacksmithTypes.btMainRecord
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

    this.writeTransforms = function(pluginId, transforms) {
        try {
            const processedTransforms = processTransforms(transforms);
            const allTransforms = addDependenciesToTransformList(processedTransforms);
            const recordObjects = allTransforms.map(transform => transformToElementObject(transform));
            writeRecordObjects(pluginId, recordObjects);
        }
        catch (ex) {
            blacksmithHelpersService.logWarn(ex);
        }
    }
});
