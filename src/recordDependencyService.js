ngapp.service('recordDependencyService', function(blacksmithHelpersService) {
    const ignoredFilenames = ['Skyrim.esm'];

    let getExternalRecordPathLinkedToByElement = function(id) {
        let externalRecordPath = '';
        if (blacksmithHelpersService.isReference(id)) {
            xelib.WithHandle(
                xelib.GetLinksTo(id),
                linkId => {
                    if (linkId) {
                        const linkPath = xelib.Path(linkId);
                        const [linkFilename, linkFormId] = linkPath.split('\\');
                        if (!ignoredFilenames.includes(linkFilename)) {
                            externalRecordPath = linkFilename + '\\' + linkFormId;
                        }
                    }
                }
            );
        }
        return externalRecordPath;
    }

    let getReferencedRecords = function(recordPath) {
        let records = [];

        xelib.WithHandle(
            xelib.GetElement(0, recordPath),
            id => blacksmithHelpersService.forEachElement(
                id,
                leafId => {
                    const externalRecordPath = getExternalRecordPathLinkedToByElement(leafId);
                    if (externalRecordPath && !records.includes(externalRecordPath)) {
                        records.push(externalRecordPath);
                    }
                },
                {
                    containerPred: containerId => xelib.LocalPath(containerId) !== 'Record Header'
                }
            )
        );

        return records;
    };
    
    let buildDependencies = function(recordPath, dependencies) {
        if (recordPath === '' || dependencies.includes(recordPath)) {
            return;
        }

        const myDependencies = getReferencedRecords(recordPath);
        for (const myDependency of myDependencies) {
            buildDependencies(myDependency, dependencies);
        }
        dependencies.push(recordPath);
    };

    this.getDependencies = function(recordPaths) {
        let dependencies = [];
        for (const recordPath of recordPaths) {
            buildDependencies(recordPath, dependencies);
        }
        return dependencies;
    };

    let getRecordPath = function(record) {
        const recordHeader = record['Record Header'];
        const formId = recordHeader ? recordHeader['FormID'] : '';
        return formId ? blacksmithHelpersService.getPathFromReference(formId) : '';
    }

    this.getRecordObjectDependencies = function(records) {
        const recordPaths = records.map(record => getRecordPath(record));
        const dependencies = this.getDependencies(recordPaths);
        // keep track of which records aren't in dependencyObjects
        const recordsCopy = [...records];
        const dependencyObjects = dependencies.map(recordPath => {
            const recordIndex = recordPaths.indexOf(recordPath);
            if (recordIndex >= 0) {
                recordsCopy[recordIndex] = undefined;
                return records[recordIndex];
            }
            return xelib.WithHandle(
                xelib.GetElement(0, recordPath),
                id => xelib.ElementToObject(id)
            );
        });
        // add the unused records to dependencyObjects
        return dependencyObjects.concat(recordsCopy.filter(record => record !== undefined));
    }
});
