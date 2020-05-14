module.exports = ({ngapp, modulePath}) =>
ngapp.service('leafletService', function() {
    let leaflet = undefined;

    this.getLeaflet = function() {
        if (!leaflet) {
            leaflet = require(`${modulePath}\\lib\\leaflet\\leaflet-src`);
            global.lg = leaflet;
            
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
        }

        return leaflet;
    };
});
