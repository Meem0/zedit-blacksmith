ngapp.directive('editPath', function() {
    let getBasePath = function(fileType) {
        if (fileType === 'mesh') {
            return `${xelib.GetGlobal('DataPath')}meshes\\`;
        }
        return '';
    };

    let isSubpathOf = function(path, basePath) {
        return path.toLowerCase().startsWith(basePath.toLowerCase());
    };

    let getFilters = function(fileType) {
        if (fileType === 'mesh') {
            return [
                { name: 'NetImmerse Model Files', extensions: ['nif'] }
            ];
        }
        return [];
    };

    let editPathLink = function(scope) {
        scope.browse = function() {
            const basePath = getBasePath(scope.type);
            const selectedFile = fh.selectFile('Select file', basePath, getFilters(scope.type));
            debugger;
            if (!selectedFile) {
                return;
            }

            if (!isSubpathOf(selectedFile, basePath)) {
                logger.error(`You must choose a file under the directory "${basePath}".`);
                return;
            }

            // TODO: if external file chosen, let user choose a destination directory under data/meshes/ to copy the file to

            const relativeFile = selectedFile.substring(basePath.length);
            scope.model = relativeFile;
        };
    };

    return {
        restrict: 'E',
        scope: {
            model: '=',
            type: '@'
        },
        templateUrl: `${modulePath}/partials/editPath.html`,
        link: editPathLink
    }
});
