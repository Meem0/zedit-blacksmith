ngapp.service('recordDependencyService', function() {
    const ignoredFilenames = ['Skyrim.esm'];
    const vtReference = xelib.valueTypes.indexOf('vtReference');

    let buildReferencedRecords = function(id, records) {
        if (xelib.LocalPath(id) === 'Record Header') {
            return;
        }

        if (xelib.ElementCount(id) > 0) {
            xelib.WithEachHandle(
                xelib.GetElements(id),
                childId => buildReferencedRecords(childId, records)
            );
        }
        else if (xelib.ValueType(id) === vtReference) {
            let linkPath = '';
            xelib.WithHandle(
                xelib.GetLinksTo(id),
                linkId => {
                    if (linkId) {
                        linkPath = xelib.Path(linkId);
                        [linkFilename, linkFormId] = linkPath.split('\\');
                        linkRecord = linkFilename + '\\' + linkFormId;
                        if (!ignoredFilenames.includes(linkFilename) && !records.includes(linkRecord)) {
                            records.push(linkRecord);
                        }
                    }
                }
            );
        }
    };

    let getReferencedRecords = function(recordPath) {
        let records = [];
        xelib.WithHandle(
            xelib.GetElement(0, recordPath),
            id => buildReferencedRecords(id, records)
        );
        return records;
    };

    let buildDependencies = function(recordPath, dependencies) {
        if (dependencies.includes(recordPath)) {
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
});
