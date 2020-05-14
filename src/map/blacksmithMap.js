module.exports = ({ngapp, fh, modulePath, moduleUrl}, blacksmithHelpers) => {
ngapp.controller('blacksmithMapModalController', function($scope, $timeout, blacksmithMapService, cellService, mapDataService, jsonService, progressService) {
    const zoneSettings = jsonService.loadJsonFile('map/zoneSettings');
    $scope.spinnerUrl = `${moduleUrl}/resources/images/LoadSpinner.png`;
    $scope.showMap = true;

    let bksMap;

    let getContainerLoot = function(contRecord) {
        const fakeLoot = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        const numItems = Math.floor(Math.random() * 20);
        let loot = [];
        for (let i = 0; i < numItems; ++i) {
            const itemIndex = Math.floor(Math.random() * fakeLoot.length);
            const itemName = fakeLoot[itemIndex];
            let lootEntry = loot.find(({name}) => name === itemName);
            if (!lootEntry) {
                lootEntry = {
                    name: itemName,
                    count: 0
                };
                loot.push(lootEntry);
            }
            ++lootEntry.count;
        }
        return loot;
    };

    let setSelectedContainer = function(container) {
        $scope.selectedContainerName = container.name;
        blacksmithHelpers.runOnReferenceRecord(container.contReference, contRecord => {
            $scope.selectedContainerEdid = xelib.EditorID(contRecord);
            $scope.selectedContainerLoot = getContainerLoot(contRecord);
        });

        $scope.reloadContainerLoot = function() {
            blacksmithHelpers.runOnReferenceRecord(container.contReference, contRecord => {
                $scope.selectedContainerLoot = getContainerLoot(contRecord);
            });
        };
    };

    let onDoorSelected = function(door) {
        openMapWithZone(door.destinationZoneReference);
    };

    let openMapWithZone = function(zoneReference) {
        const zoneName = blacksmithHelpers.runOnReferenceRecord(zoneReference, xelib.Name);
        const settings = zoneSettings[zoneReference];

        $timeout(() => {
            $scope.loadingMap = true;
            $scope.selectedContainerName = undefined;
            $scope.currentZoneName = zoneName;

            const selectedWorldspace = $scope.worldspaces.find(({reference}) => reference === zoneReference);
            if (selectedWorldspace) {
                $scope.selectedWorldspace = selectedWorldspace;
            }
    
            if (bksMap) {
                bksMap.remove();
            }
            
            $timeout(() => {
                let doors = mapDataService.getDoors(zoneReference);
        
                let containers = mapDataService.getContainers(zoneReference);
        
                let tileData;
                if (settings && settings.tileData) {
                    tileData = { ...settings.tileData };
                    tileData.zoomLevelsDir = modulePath + tileData.zoomLevelsDir;
                }
        
                bksMap = blacksmithMapService.createMap('blacksmithMap', {tileData, doors, containers});
        
                bksMap.registerOnDoorSelected(onDoorSelected);
                bksMap.registerOnContainerSelected(container => {
                    $timeout(() => setSelectedContainer(container));
                });
        
                $scope.loadingMap = false;

                global.bmg = bksMap;
                global.mg = bksMap.map;
            }, 1);
        });
    };

    $scope.onWorldspaceSelected = function() {
        if ($scope.selectedWorldspace) {
            openMapWithZone($scope.selectedWorldspace.reference);   
        }
    };

    $scope.worldspaces = cellService.getWorldspaces();
    $scope.selectedWorldspace = $scope.worldspaces.find(({name}) => name === 'Skyrim');
    $scope.onWorldspaceSelected();

    $scope.onDebug = function() {
        debugger;
    };
});

ngapp.run(function(contextMenuFactory) {
    contextMenuFactory.treeViewItems.push({
        visible: (scope) => true,
        build: (scope, items) => {
            items.push({
                label: 'Blacksmith Map',
                callback: () => scope.$emit('openModal', 'blacksmithMap', {
                    basePath: `${moduleUrl}/partials/map`
                })
            });
        }
    });
});

}
