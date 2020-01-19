ngapp.service('recordDependencyService', function(blacksmithHelpersService) {
    const ignoredFilenames = ['Skyrim.esm'];

    let forEachValue = function(obj, func) {
        if (Array.isArray(obj)) {
            for (elem of obj) {
                forEachValue(elem, func);
            }
        }
        else if (typeof(obj) === 'object') {
            for (value of Object.values(obj)) {
                forEachValue(value, func);
            }
        }
        else {
            func(obj);
        }
    }

    let getReferenceFromRecordObject = function(recordObject) {
        let formId = '';
        if (typeof(recordObject) === 'object') {
            const recordHeader = recordObject['Record Header'];
            if (typeof(recordHeader) === 'object') {
                formId = recordHeader['FormID'];
                if (typeof(formId) !== 'string') {
                    formId = '';
                }
            }
        }
        return formId;
    }

    let getExternalReferencesInRecordObject = function(recordObject) {
        const myReference = getReferenceFromRecordObject(recordObject);
        let references = [];
        forEachValue(recordObject, value => {
            if (value === myReference) {
                // ignore self-reference
                return;
            }

            const { filename } = blacksmithHelpersService.getFileNameAndFormIdFromReference(value);
            if (filename && !ignoredFilenames.includes(filename)) {
                references.push(value);
            }
        });
        return references;
    }

    let buildDependencies = function(recordObject, dependencies, inputRecordObjects) {
        const myReference = getReferenceFromRecordObject(recordObject);
        if (myReference) {
            // skip this recordObject if it is already in the dependency list
            const existingDependency = dependencies.find(dependencyRecordObject => myReference === getReferenceFromRecordObject(dependencyRecordObject));
            if (existingDependency !== undefined) {
                return;
            }
        }

        const externalReferences = getExternalReferencesInRecordObject(recordObject);
        for (const externalReference of externalReferences) {
            const inputRecordObject = inputRecordObjects.find(inputRecordObject => externalReference === getReferenceFromRecordObject(inputRecordObject));
            let dependencyRecordObject;
            if (inputRecordObject) {
                // this reference could be pointing to a record that is part of the input, as a record object
                // in that case we want to process the input record, not the one on disk, which could have stale values
                dependencyRecordObject = inputRecordObject;
            }
            else {
                const externalRecordPath = blacksmithHelpersService.getPathFromReference(externalReference);
                dependencyRecordObject = xelib.WithHandle(
                    xelib.GetElement(0, externalRecordPath),
                    id => xelib.ElementToObject(id)
                );
            }
            buildDependencies(dependencyRecordObject, dependencies, inputRecordObjects);
        }

        dependencies.push(recordObject);
    };

    this.getDependencies = function(recordObjects) {
        let dependencies = [];
        for (const recordObject of recordObjects) {
            buildDependencies(recordObject, dependencies, recordObjects);
        }
        return dependencies;
    };
});
