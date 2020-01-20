ngapp.service('transformBuilderService', function(blacksmithHelpersService) {
    // e.g. [{a: 1, b: 2}, {c: 3, d: 4}] -> {a: 1, b: 2, c: 3, d: 4}
    let arrayOfObjectsToObject = function(array) {
        return Object.assign({}, ...array);
    }
    
    let formatContainer = function(containerId, children) {
        if (!children) {
            return;
        }
        
        const containerTypeInfo = blacksmithHelpersService.getTypeInfo(containerId);
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
                ? blacksmithHelpersService.getReferenceFromRecord(containerId)
                : xelib.Name(containerId);
            const value = containerTypeInfo.isArray ? children : arrayOfObjectsToObject(children);
            return { [key]: value };
        }
    }

    let getElementValue = function(id) {
        if (!xelib.GetIsModified(id) || blacksmithHelpersService.isHeader(id)) {
            return undefined;
        }
        return blacksmithHelpersService.elementToObject(id);
    }

    let shouldRecurseOnContainer = function(containerId) {
        return (
            !blacksmithHelpersService.isHeader(containerId)
            && !blacksmithHelpersService.isArray(containerId)
            && (containerId === 0 || xelib.GetIsModified(containerId))
        );
    }
    
    let getRecordsFromModifiedElements = function() {
        return blacksmithHelpersService.forEachElement(
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
