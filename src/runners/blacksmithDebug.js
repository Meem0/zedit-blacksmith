module.exports = ({ngapp, xelib}, blacksmithHelpers) =>
ngapp.run(function(settingsService, contextMenuFactory, writeObjectToElementService) {
    let blacksmithDebug = function() {
        try {
            let selectedNode = scope.selectedNodes[0];
            if (selectedNode) {
                let controlFlag = 3;
                debugger;
                if (controlFlag === 2) {
                    if (blacksmithHelpers.isValidElement(selectedNode.handle)) {
                        debugger;
                    }
                }
                else if (controlFlag === 3) {
                    const customObject = blacksmithHelpers.elementToObject(selectedNode.handle);
                    const xelibObject = xelib.ElementToObject(selectedNode.handle);
                    console.log(customObject);
                    console.log(xelibObject);
                }
                else if (controlFlag === 4) {
                    const customObject = blacksmithHelpers.elementToObject(selectedNode.handle);
                    let filename = 'NewFile77.esp';
                    xelib.WithHandle(
                        xelib.AddFile(filename),
                        fileHandle => {
                            try {
                                writeObjectToElementService.writeObjectToRecord(fileHandle, customObject);
                            }
                            catch (ex) {
                                debugger;
                            }
                            finally {
                                scope.$root.$broadcast('reloadGUI');
                            }
                        }
                    );
                }
            }
        }
        catch (ex) {
            debugger;
        }
        finally {
            scope.$root.$broadcast('reloadGUI');
        }
    };

    contextMenuFactory.treeViewItems.push({
        visible: (scope, items) => items.length > 0 && !items.last().divider,
        build: (scope, items) => items.push({ divider: true })
    });

    contextMenuFactory.treeViewItems.push({
        visible: (scope) => settingsService.settings.blacksmith.debugMode,
        build: (scope, items) => {
            items.push({
                label: 'Debug',
                callback: blacksmithDebug
            });
        }
    });
});
