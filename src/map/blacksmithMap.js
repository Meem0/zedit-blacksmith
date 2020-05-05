module.exports = ({ngapp, fh, modulePath, moduleUrl}) => {

ngapp.controller('blacksmithMapModalController', function($scope) {
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

    let SkyrimMapIcon = leaflet.Icon.extend({
        iconSize: [32, 32]
    });

    let bounds = [[-200000, -200000], [200000, 200000]];
    let mapOpts = {
        crs: leaflet.CRS.Simple,
        maxBounds: bounds,
        minZoom: -15
    };
    let bksMap = leaflet.map('blacksmithMap', mapOpts);
    let image = leaflet.imageOverlay(`${modulePath}/resources/map/map.png`, bounds);
    image.addTo(bksMap);
    bksMap.fitBounds(bounds);

    console.log('Loading STAT REFRs...');
    let statRefrs = xelib.GetREFRs(0, 'STAT');
    console.log('Done loading STAT REFRs');

    let numProcessed = 0;
    let numMarkers = 0;
    let lastLogTime = Date.now();

    xelib.WithEachHandle(statRefrs, statRefr => {
        ++numProcessed;

        let currentTime = Date.now();
        if (currentTime - lastLogTime > 1000) {
            console.log(`${numProcessed}/${statRefrs.length} - Found ${numMarkers} markers`);
            lastLogTime = currentTime;
        }

        if (!xelib.HasElement(statRefr, 'Map Marker')) {
            return;
        }
        let type = xelib.GetValue(statRefr, 'Map Marker\\TNAM\\Type');
        if (type === 'None') {
            return;
        }
        let name = xelib.GetValue(statRefr, 'Map Marker\\FULL');

        let iconUrl = '';
        let customIconUrl = `${modulePath}\\resources\\map\\${type}.svg`;
        if (type && fh.jetpack.exists(customIconUrl)) {
            iconUrl = customIconUrl;
        }
        if (!iconUrl) {
            console.log(`Unknown marker type ${type} for ${name}`);
            iconUrl = `${modulePath}\\resources\\map\\Unknown.svg`
        }

        let x = xelib.GetValue(statRefr, 'DATA\\Position\\X');
        let y = xelib.GetValue(statRefr, 'DATA\\Position\\Y');
        let icon = new SkyrimMapIcon({ iconUrl });
        leaflet.marker([y, x], {icon}).addTo(bksMap).bindPopup(name);

        ++numMarkers;
    });

    global.lg = leaflet;
    global.mg = bksMap;
    
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
