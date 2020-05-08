module.exports = ({ngapp, fh, modulePath, moduleUrl}, blacksmithHelpers) => {
ngapp.controller('blacksmithMapModalController', function($scope, blacksmithMapService, leafletService) {
    let leaflet = leafletService.getLeaflet();

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

    let SkyrimMapIcon = leaflet.Icon.extend({
        iconSize: [32, 32],
        iconAnchor: [32, 16]
    });

    let addMarkerToMap = function({type, name, x, y}, map) {
        let iconUrl = '';
        let customIconUrl = `${modulePath}\\resources\\map\\icons\\${type}.svg`;
        if (type && fh.jetpack.exists(customIconUrl)) {
            iconUrl = customIconUrl;
        }
        if (!iconUrl) {
            console.log(`Unknown marker type ${type} for ${name}`);
            iconUrl = `${modulePath}\\resources\\map\\icons\\Unknown.svg`
        }

        let icon = new SkyrimMapIcon({ iconUrl });
        map.addMarker(icon, {x, y}, name);
    };

    const tileData = {
        zoomLevelsDir: `${modulePath}\\resources\\map\\tiles\\`,
        tileFormat: 'skyrim-{x}-{y}-{z}.jpg',
        tileCoordinateSize: 8192,
        tileGridLength: 64,
        coordinateOriginTileIndex: {x: 28.5, y: 25}
    };
    
    let bksMap = blacksmithMapService.createMap('blacksmithMap', tileData);
    
    let allMarkers = getAllMapMarkers();
    allMarkers.forEach(marker => addMarkerToMap(marker, bksMap));

    global.lg = leaflet;
    global.mg = bksMap.map;
    global.jg = fh.jetpack;
    
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
