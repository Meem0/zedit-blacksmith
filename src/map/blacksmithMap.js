module.exports = ({ngapp, fh, modulePath, moduleUrl}, blacksmithHelpers) => {
ngapp.controller('blacksmithMapModalController', function($scope, $timeout, blacksmithMapService, leafletService, cellService, mapDataService) {
    let leaflet = leafletService.getLeaflet();
    global.lg = leaflet;
    global.jg = fh.jetpack;
    global.bkh = blacksmithHelpers;

    const zoneTileData = {
        'Skyrim.esm:00003C': {
            zoomLevelsDir: `${modulePath}\\resources\\map\\tiles\\`,
            tileFormat: 'skyrim-{x}-{y}-{z}.jpg',
            tilePixelSize: 256,
            tileCoordinateSize: 131072,
            tileGridLength: 4,
            coordinateOriginTileIndex: {x: 1.78125, y: 1.59375}
        }
    };

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
        if (bksMap) {
            bksMap.remove();
        }

        $timeout(() => {
            $scope.selectedContainerName = undefined;
            $scope.currentZoneName = blacksmithHelpers.runOnReferenceRecord(zoneReference, xelib.Name);
        });

        const selectedWorldspace = $scope.worldspaces.find(({reference}) => reference === zoneReference);
        if (selectedWorldspace) {
            $timeout(() => {
                $scope.selectedWorldspace = selectedWorldspace;
            });
        }

        const tileData = zoneTileData[zoneReference];
        let doors = mapDataService.getDoors(zoneReference);
        let containers = mapDataService.getContainers(zoneReference);

        bksMap = blacksmithMapService.createMap('blacksmithMap', {tileData, doors, containers});
        bksMap.registerOnDoorSelected(onDoorSelected);
        bksMap.registerOnContainerSelected(container => {
            $timeout(() => setSelectedContainer(container));
        });

        global.bmg = bksMap;
        global.mg = bksMap.map;
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
