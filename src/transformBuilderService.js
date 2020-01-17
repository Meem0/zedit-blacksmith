ngapp.service('transformBuilderService', function(blacksmithHelpersService) {
    this.buildTransformsFromModifiedElements = function() {
        const transforms = blacksmithHelpersService.forEachElement(
            0,
            leafId => xelib.GetIsModified(leafId) ? xelib.ElementToObject(leafId) : undefined,
            containerId => containerId === 0 || xelib.GetIsModified(containerId),
            (containerId, children) => {
                if (children.length > 0) {
                    const containerTypeInfo = blacksmithHelpersService.getTypeInfo(containerId);
                    if (containerTypeInfo.isGroup) {
                        return children;
                    }
                    else if (containerTypeInfo.isFile) {
                        const records = children.flat();
                        const filename = xelib.Name(containerId);
                        return records.map(child => {
                            const [[formId, value]] = Object.entries(child);
                            return { [filename + ':' + formId]: value };
                        });
                    }
                    else if (containerId === 0) {
                        return Object.assign({}, ...children.flat());
                    }
                    else {
                        let value = children;
                        if (!blacksmithHelpersService.isArray(containerId)) {
                            value = Object.assign({}, ...children);
                        }
                        const keyName = containerTypeInfo.isMainRecord ? xelib.GetHexFormID(containerId, /*native*/ true, /*local*/ true) : xelib.Name(containerId);
                        return { [keyName]: value };
                    }
                }
            }
        );
        return transforms;
    }
});
