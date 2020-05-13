module.exports = ({ngapp, fh, modulePath, moduleUrl}, blacksmithHelpers) => {
ngapp.controller('blacksmithMapModalController', function($scope, $timeout, blacksmithMapService, leafletService, cellService) {
    let leaflet = leafletService.getLeaflet();
    global.lg = leaflet;
    global.jg = fh.jetpack;
    global.bkh = blacksmithHelpers;

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
                    const destinationZoneReference = xelib.WithHandle(resolveDestinationZone(doorRecord), blacksmithHelpers.getReferenceFromRecord);
                    doors.push({
                        name: xelib.LongName(doorRecord),
                        coordinates: {
                            x: xelib.GetFloatValue(doorRecord, 'DATA\\Position\\X'),
                            y: xelib.GetFloatValue(doorRecord, 'DATA\\Position\\Y')
                        },
                        destinationZoneName: blacksmithHelpers.runOnReferenceRecord(destinationZoneReference, xelib.Name),
                        destinationZoneReference,
                        reference: blacksmithHelpers.getReferenceFromRecord(doorRecord)
                    });
                }
                return doors;
            }, []);
        });
    };

    let getContainers = function(zoneRecord) {
        return xelib.WithHandles(xelib.GetREFRs(zoneRecord, 'CONT'), contRefrs => {
            return contRefrs.reduce((conts, contRefr) => {
                xelib.WithHandle(xelib.GetLinksTo(contRefr, 'NAME'), contRecord => {
                    conts.push({
                        name: xelib.Name(contRecord),
                        coordinates: {
                            x: xelib.GetFloatValue(contRefr, 'DATA\\Position\\X'),
                            y: xelib.GetFloatValue(contRefr, 'DATA\\Position\\Y')
                        },
                        contReference: blacksmithHelpers.getReferenceFromRecord(contRecord),
                        reference: blacksmithHelpers.getReferenceFromRecord(contRefr)
                    });
                });
                return conts;
            }, []);
        });
    };

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

    let onDoorSelected = function(door) {
        openMapWithZone(door.destinationZoneReference);
    };

    let openMapWithZone = function(zoneReference) {
        if (bksMap) {
            bksMap.remove();
        }

        $timeout(() => {
            $scope.currentZoneName = blacksmithHelpers.runOnReferenceRecord(zoneReference, xelib.Name);
        });

        const selectedWorldspace = $scope.worldspaces.find(({reference}) => reference === zoneReference);
        if (selectedWorldspace) {
            $timeout(() => {
                $scope.selectedWorldspace = selectedWorldspace;
            });
        }

        const tileData = zoneTileData[zoneReference];
        let doors, containers;
        blacksmithHelpers.runOnReferenceRecord(zoneReference, zoneRecord => {
            doors = getDoors(zoneRecord);
            containers = getContainers(zoneRecord);
        });

        bksMap = blacksmithMapService.createMap('blacksmithMap', {tileData, doors, containers});
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
