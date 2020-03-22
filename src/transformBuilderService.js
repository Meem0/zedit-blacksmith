ngapp.service('transformBuilderService', function() {
    // e.g. [{a: 1, b: 2}, {c: 3, d: 4}] -> {a: 1, b: 2, c: 3, d: 4}
    let arrayOfObjectsToObject = function(array) {
        return Object.assign({}, ...array);
    }
    
    let formatContainer = function(containerId, children) {
        if (!children) {
            return;
        }
        
        const containerTypeInfo = blacksmithHelpers.getTypeInfo(containerId);
        if (containerId === 0 || containerTypeInfo.isFile || containerTypeInfo.isGroup) {
            /*
                for root, files, and groups, we want to transfrom our input from
                [
                    {
                        record1: { ... },
                        record2: { ... }
                    },
                    {
                        record3: { ... },
                        record4: { ... }
                    }
                ]
                to
                {
                    record1: { ... },
                    record2: { ... },
                    record3: { ... },
                    record4: { ... }
                }
            */
            return arrayOfObjectsToObject(children);
        }
        else {
            const key = containerTypeInfo.isMainRecord
                ? blacksmithHelpers.getReferenceFromRecord(containerId)
                : xelib.Name(containerId);
            const value = containerTypeInfo.isArray ? children : arrayOfObjectsToObject(children);
            return { [key]: value };
        }
    }

    let getElementValue = function(id) {
        if (!xelib.GetIsModified(id) || blacksmithHelpers.isHeader(id)) {
            return undefined;
        }
        return blacksmithHelpers.elementToObject(id);
    }

    let shouldRecurseOnContainer = function(containerId) {
        return (
            !blacksmithHelpers.isHeader(containerId)
            && !blacksmithHelpers.isArray(containerId)
            && (containerId === 0 || xelib.GetIsModified(containerId))
        );
    }
    
    let getRecordsFromModifiedElements = function() {
        return blacksmithHelpers.forEachElement(
            0,
            getElementValue,
            {
                // should recurse on a container element:
                containerPred: shouldRecurseOnContainer,
                // how should a container element process the results of its children:
                containerFunc: formatContainer,
                runLeafFuncOnSkippedContainers: true
            }
        );
    }
    
    this.buildTransformsFromModifiedElements = function() {
        const records = getRecordsFromModifiedElements();
        return Object.entries(records).map(
            ([recordReference, recordContents]) => ({
                base: recordReference,
                delta: recordContents
            })
        );
    }
});
