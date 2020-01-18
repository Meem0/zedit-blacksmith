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
                containerId => xelib.LocalPath(containerId) !== 'Record Header'
            )
        );

        return records;
    };
    
    let getRecordPath = function(record) {
        if (typeof(record) === 'string') {
            return record;
        }
        
        const recordHeader = record['Record Header'];
        const formId = recordHeader ? recordHeader['Form ID'] : '';
        return formId ? formId : '';
    }

    let buildDependencies = function(record, dependencies) {
        const recordPath = getRecordPath(record);
        if (dependencies.includes(recordPath)) {
            return;
        }

        const myDependencies = getReferencedRecords(recordPath);
        for (const myDependency of myDependencies) {
            buildDependencies(myDependency, dependencies);
        }
        dependencies.push(recordPath);
    };

    this.getDependencies = function(records) {
        let dependencies = [];
        for (const record of records) {
            buildDependencies(record, dependencies);
        }
        return dependencies;
    };
});
