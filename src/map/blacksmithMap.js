module.exports = ({ngapp, fh, modulePath, moduleUrl}, blacksmithHelpers) => {
ngapp.controller('blacksmithMapModalController', function($scope) {
    const tileDir = `${modulePath}\\resources\\map\\tiles\\`;
    const tileFormat = 'zoom{z}\\skyrim-{x}-{y}-{z}.jpg';

    const minZoom = -9;

    const tileCoordinateSize = 8192;
    const tileGridLength = 64;
    const coordinateOriginTileIndex = {x: 28.5, y: 25};

    const tileDirJP = fh.jetpack.cwd(tileDir);
    const zoomDirs = tileDirJP.list().filter(dir => dir.startsWith('zoom'));
    const lowestZoom = zoomDirs.reduce((lowestZoom, dir) => {
        const num = Number.parseInt(dir.substring(4));
        if (num < lowestZoom) {
            lowestZoom = num;
        }
        return lowestZoom;
    }, 100);
    const numZoomLevels = zoomDirs.length;
    const zoomOffset = lowestZoom - minZoom;

    const cssElementId = 'blacksmithLeafletCSS';
    let cssElement = document.getElementById(cssElementId);
    if (!cssElement) {
        let headElement = document.getElementsByTagName('head')[0];
        if (headElement) {
            let ngHeadElement = angular.element(headElement);

            const leafletCSSPath = `${modulePath}\\lib\\leaflet\\leaflet.css`;
            ngHeadElement.append(`<link id="${cssElementId}" rel="stylesheet" type="text/css" href="${leafletCSSPath}">`);
        }
    }

    let leaflet = require(`${modulePath}\\lib\\leaflet\\leaflet-src`);

    const mapSize = tileCoordinateSize * tileGridLength;
    const mapBounds = [[0, 0], [-mapSize, mapSize]];
    const skyrimOffset = {
        x: coordinateOriginTileIndex.x * tileCoordinateSize,
        y: -coordinateOriginTileIndex.y * tileCoordinateSize
    };
    let skyrimCoordsToLatlng = function(a, b) {
        let x, y;
        if (typeof(a) === 'object') {
            x = a.x;
            y = a.y;
        }
        else {
            x = a;
            y = b;
        }
        return [y + skyrimOffset.y, x + skyrimOffset.x];
    };
    let latlngToSkyrimCoords = function(latlng) {
        let lat, lng;
        if (Array.isArray(latlng)) {
            ([lat, lng] = latlng);
        }
        else {
            ({lat, lng} = latlng);
        }
        return {x: lng - skyrimOffset.x, y: lat - skyrimOffset.y};
    };

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

    let getMapMarkers = function() {
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

    let SkyrimMapIcon = leaflet.Icon.extend({
        iconSize: [32, 32]
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
        let iconLatlng = skyrimCoordsToLatlng(x, y);
        leaflet.marker(iconLatlng, {icon}).addTo(map).bindPopup(name);
    };

    let mapOpts = {
        crs: leaflet.CRS.Simple,
        maxBounds: mapBounds,
        minZoom,
        maxZoom: minZoom + numZoomLevels - 1
    };
    let bksMap = leaflet.map('blacksmithMap', mapOpts);
    
    let tileOpts = {
        bounds: mapBounds,
        minZoom,
        maxZoom: minZoom + numZoomLevels - 1,
        zoomOffset
    };
    let tileLayer = leaflet.tileLayer(tileDir + tileFormat, tileOpts);
    tileLayer.addTo(bksMap);
    
    bksMap.fitBounds(mapBounds);

    let cityMarkers = getCityMapMarkers();
    cityMarkers.forEach(marker => addMarkerToMap(marker, bksMap));

    global.lg = leaflet;
    global.mg = bksMap;
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
