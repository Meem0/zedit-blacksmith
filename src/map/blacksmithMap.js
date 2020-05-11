module.exports = ({ngapp, fh, modulePath, moduleUrl}, blacksmithHelpers) => {
ngapp.controller('blacksmithMapModalController', function($scope, $timeout, blacksmithMapService, leafletService, cellService) {
    let leaflet = leafletService.getLeaflet();
    global.lg = leaflet;
    global.jg = fh.jetpack;
    global.bkh = blacksmithHelpers;

    let getMapMarkerObject = function(mapMarkerRecord) {
        if (!xelib.HasElement(mapMarkerRecord, 'Map Marker')) {
            return;
        }
        let type = xelib.GetValue(mapMarkerRecord, 'Map Marker\\TNAM\\Type');
        if (type === 'None') {
            return;
        }
        let name = xelib.GetValue(mapMarkerRecord, 'Map Marker\\FULL');

        return {
            name,
            type,
            x: xelib.GetFloatValue(mapMarkerRecord, 'DATA\\Position\\X'),
            y: xelib.GetFloatValue(mapMarkerRecord, 'DATA\\Position\\Y'),
            reference: blacksmithHelpers.getReferenceFromRecord(mapMarkerRecord)
        };
    };

    let getCityMapMarkers = function() {
        const cityMarkerReferences = ['Skyrim.esm:0162CE', 'Skyrim.esm:01773A', 'Skyrim.esm:017760', 'Skyrim.esm:0177B0', 'Skyrim.esm:0177EF', 'Skyrim.esm:01C38A', 'Skyrim.esm:01C390', 'Skyrim.esm:038436', 'Skyrim.esm:04D0F4'];
        return cityMarkerReferences.map(reference => xelib.WithHandle(blacksmithHelpers.getRecordFromReference(reference), getMapMarkerObject));
    };

    let loadMapMarkers = function() {
        console.log('Loading STAT REFRs...');
        let statRefrs = xelib.GetREFRs(0, 'STAT');
        console.log('Done loading STAT REFRs');
    
        let numProcessed = 0;
        let numMarkers = 0;
        let lastLogTime = Date.now();

        let markers = [];
    
        xelib.WithEachHandle(statRefrs, statRefr => {
            ++numProcessed;
    
            let currentTime = Date.now();
            if (currentTime - lastLogTime > 1000) {
                console.log(`${numProcessed}/${statRefrs.length} - Found ${numMarkers} markers`);
                lastLogTime = currentTime;
            }

            let mapMarkerObject = getMapMarkerObject(statRefr);
            if (mapMarkerObject) {
                markers.push(mapMarkerObject);
                ++numMarkers;
            }
        });

        return markers;
    };

    let getAllMapMarkers = function() {
        const markerReferences = fh.loadJsonFile(`${modulePath}/resources/map/markers.json`);
        return markerReferences.map(reference => xelib.WithHandle(blacksmithHelpers.getRecordFromReference(reference), getMapMarkerObject));
    };

    let addMarkerToMap = function(iconUrl, {x, y}, name, map) {
        let icon = new leaflet.Icon({iconUrl, iconSize: [24, 24]});
        map.addMarker(icon, {x, y}, name);
    };

    let getMapMarkerUrl = function(type) {
        let iconUrl = '';
        let customIconUrl = `${modulePath}\\resources\\map\\icons\\${type}.svg`;
        if (type && fh.jetpack.exists(customIconUrl)) {
            iconUrl = customIconUrl;
        }
        if (!iconUrl) {
            console.log(`Unknown marker type ${type}`);
            iconUrl = `${modulePath}\\resources\\map\\icons\\Unknown.svg`
        }
        return iconUrl;
    };

    let resolveDestinationZone = doorRecord => {
        return xelib.WithHandle(xelib.GetLinksTo(doorRecord, 'XTEL\\Door'), linkedDoorRecord => {
            let destinationCellRecord = linkedDoorRecord ? xelib.GetLinksTo(linkedDoorRecord, 'Cell') : 0;
            let destinationZoneRecord = destinationCellRecord;
            if (destinationCellRecord && xelib.HasElement(destinationCellRecord, 'Worldspace')) {
                destinationZoneRecord = xelib.GetLinksTo(destinationCellRecord, 'Worldspace');
                xelib.Release(destinationCellRecord);
            }
            return destinationZoneRecord;
        });
    };
    
    let getDoors = function(zoneRecord) {
        return xelib.WithHandles(xelib.GetREFRs(zoneRecord, 'DOOR'), doorRecords => {
            return doorRecords.reduce((doors, doorRecord) => {
                if (xelib.HasElement(doorRecord, 'XTEL')) {
                    doors.push({
                        name: xelib.LongName(doorRecord),
                        coordinates: {
                            x: xelib.GetFloatValue(doorRecord, 'DATA\\Position\\X'),
                            y: xelib.GetFloatValue(doorRecord, 'DATA\\Position\\Y')
                        },
                        destinationZoneReference: xelib.WithHandle(resolveDestinationZone(doorRecord), blacksmithHelpers.getReferenceFromRecord),
                        reference: blacksmithHelpers.getReferenceFromRecord(doorRecord)
                    });
                }
                return doors;
            }, []);
        });
    };

    const zoneTileData = {
        'Skyrim.esm:00003C': {
            zoomLevelsDir: `${modulePath}\\resources\\map\\tiles\\`,
            tileFormat: 'skyrim-{x}-{y}-{z}.jpg',
            tileCoordinateSize: 8192,
            tileGridLength: 64,
            coordinateOriginTileIndex: {x: 28.5, y: 25.5}
        }
    };

    let bksMap;

    let onDoorSelected = function(door) {
        openMapWithZone(door.destinationZoneReference);
    };

    let openMapWithZone = function(zoneReference) {
        if (bksMap) {
            bksMap.remove();
        }

        const selectedWorldspace = $scope.worldspaces.find(({reference}) => reference === zoneReference);
        if (selectedWorldspace) {
            $timeout(() => {
                $scope.selectedWorldspace = selectedWorldspace;
            });
        }

        const tileData = zoneTileData[zoneReference];
        const doors = blacksmithHelpers.runOnReferenceRecord(zoneReference, getDoors);

        bksMap = blacksmithMapService.createMap('blacksmithMap', {tileData, doors});
        bksMap.registerOnDoorSelected(onDoorSelected);

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
