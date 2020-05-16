module.exports = ({ngapp, fh, modulePath, moduleUrl}, blacksmithHelpers) => {
ngapp.controller('blacksmithMapModalController', function($scope, $timeout, blacksmithMapService, cellService, mapDataService, jsonService, progressService) {
    const zoneSettings = jsonService.loadJsonFile('map/zoneSettings');
    $scope.spinnerUrl = `${moduleUrl}/resources/images/LoadSpinner.png`;
    $scope.showMap = true;

    let bksMap;

    let getContainerMarkerData = function(containerReference) {
        let edid = '';
        let name = '';
        blacksmithHelpers.runOnReferenceRecord(containerReference, containerRecord => {
            edid = xelib.EditorID(containerRecord).toLowerCase();
            name = xelib.Name(containerRecord).toLowerCase();
        });
        
        if (name.includes('corpse') || edid.includes('corpse')) {
            return {name: 'Corpses', priority: 110};
        }
        if (edid.includes('merchant')) {
            return {name: 'Merchant Chests', priority: 105};
        }
        if (edid.includes('safe') || edid.includes('strongbox')) {
            return {name: 'Safes', priority: 140};
        }
        if (edid.includes('chest')) {
            if (edid.includes('boss')) {
                return {name: 'Boss Chests', priority: 150};
            }
            return {name: 'Chests', priority: 145};
        }
        if (name.includes('barrel') || edid.includes('barrel')) {
            return {name: 'Barrels', priority: 130};
        }
        if (name.includes('sack') || edid.includes('sack') || name.includes('satchel') || edid.includes('satchel')) {
            return {name: 'Bags', priority: 125};
        }
        if (name.includes('cupboard') || name.includes('table') || name.includes('wardrobe') || name.includes('dresser')) {
            return {name: 'Furniture', priority: 120};
        }
        if (name.includes('urn') || name.includes('pot')) {
            return {name: 'Pottery', priority: 115};
        }
        return {name: 'Other Containers', priority: 100};
    };

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

    let getDoorMarkerGroups = function(doorData) {
        let worldDoorMarkers = [];
        let doorMarkers = [];

        doorData.forEach(door => {
            const isWorldDoor = blacksmithHelpers.runOnReferenceRecord(door.destinationZoneReference, xelib.Signature) === 'WRLD';
            (isWorldDoor ? worldDoorMarkers : doorMarkers).push({
                gameCoordinates: door.coordinates,
                tooltipText: door.name,
                onClick: () => $timeout(() => onDoorSelected(door))
            });
        });

        let doorMarkerGroups = [];

        if (worldDoorMarkers.length > 0) {
            doorMarkerGroups.push({
                name: 'World Doors',
                priority: 170,
                iconSize: [32, 32],
                markerData: worldDoorMarkers
            });
        }
        if (doorMarkers.length > 0) {
            doorMarkerGroups.push({
                name: 'Doors',
                priority: 160,
                iconSize: [32, 32],
                markerData: doorMarkers
            });
        }

        return doorMarkerGroups;
    };

    let getContainerMarkerGroups = function(containerData) {
        let containerMarkerGroups = {};

        containerData.forEach(container => {
            let {name, priority} = getContainerMarkerData(container.contReference);

            let containerMarkerGroup = containerMarkerGroups[name];
            if (!containerMarkerGroup) {
                containerMarkerGroup = {
                    name,
                    priority,
                    iconSize: [24, 24],
                    markerData: []
                };
                containerMarkerGroups[name] = containerMarkerGroup;
            }

            containerMarkerGroup.markerData.push({
                gameCoordinates: container.coordinates,
                tooltipText: container.name,
                onClick: () => $timeout(() => setSelectedContainer(container))
            });
        });

        return Object.values(containerMarkerGroups);
    };

    let getMarkerGroups = function(zoneReference) {
        let doorData = mapDataService.getDoors(zoneReference);
        let containerData = mapDataService.getContainers(zoneReference);
        return [
            ...getDoorMarkerGroups(doorData),
            ...getContainerMarkerGroups(containerData)
        ];
    };

    let openMapWithZone = function(zoneReference) {
        const zoneName = blacksmithHelpers.runOnReferenceRecord(zoneReference, xelib.Name);
        const settings = zoneSettings[zoneReference];

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
            let markerGroups = getMarkerGroups(zoneReference);

            let tileData;
            if (settings && settings.tileData) {
                tileData = { ...settings.tileData };
                tileData.zoomLevelsDir = modulePath + tileData.zoomLevelsDir;
            }
    
            bksMap = blacksmithMapService.createMap();
            global.bmg = bksMap;
    
            if (tileData) {
                bksMap.setTileData(tileData);
            }
            if (markerGroups) {
                bksMap.setMarkerGroups(markerGroups);
            }

            $timeout(() => {
                bksMap.addToView('blacksmithMap');
                $scope.loadingMap = false;
                global.mg = bksMap.map;
            });
        }, 50);
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
