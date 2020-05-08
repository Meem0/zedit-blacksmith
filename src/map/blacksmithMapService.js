module.exports = ({ngapp, fh, modulePath}) =>
ngapp.service('blacksmithMapService', function(leafletService) {
    class BlacksmithMap {
        constructor(mapId) {
            let leaflet = leafletService.getLeaflet();
            const mapOpts = {
                crs: leaflet.CRS.Simple,
                minZoom: -100
            };
            this.map = leaflet.map(mapId, mapOpts);
        }

        setTileData({zoomLevelsDir, tileFormat, tileCoordinateSize, tileGridLength, coordinateOriginTileIndex}) {
            this._tileCoordinateSize = tileCoordinateSize;
            this._coordinateOriginTileIndex = coordinateOriginTileIndex;

            const mapSize = tileCoordinateSize * tileGridLength;
            const mapBounds = [[0, 0], [-mapSize, mapSize]];

            const zoomDirJp = fh.jetpack.cwd(zoomLevelsDir);
            const zoomDirs = zoomDirJp.list().filter(dir => dir.startsWith('zoom'));
            const numZoomLevels = zoomDirs.length;

            const minZoom = this.map.getBoundsZoom(mapBounds, /*inside*/ true);
            const maxZoom = minZoom + numZoomLevels - 1;
            this.map.setMaxBounds(mapBounds);
            this.map.setMinZoom(minZoom);
            this.map.setMaxZoom(maxZoom);
            this.map.setView([0, 0], minZoom);

            const lowestZoom = zoomDirs.reduce((lowestZoom, dir) => {
                const num = Number.parseInt(dir.substring(4));
                if (num < lowestZoom) {
                    lowestZoom = num;
                }
                return lowestZoom;
            }, 100);

            const tileOpts = {
                bounds: mapBounds,
                minZoom,
                maxZoom,
                zoomOffset: lowestZoom - minZoom
            };
            const tileUrl = zoomDirJp.cwd() + '\\zoom{z}\\' + tileFormat;

            let leaflet = leafletService.getLeaflet();
            let tileLayer = leaflet.tileLayer(tileUrl, tileOpts);
            tileLayer.addTo(this.map);
        }

        addMarker(icon, gameCoords, name) {
            let leaflet = leafletService.getLeaflet();

            let markerLatlng = this._gameCoordsToMapLatlng(gameCoords);
            let marker = leaflet.marker(markerLatlng, {icon}).addTo(this.map);
            if (name) {
                marker.bindPopup(name);
            }
        }

        _getGameCoordsOffset() {
            let offsetX = 0;
            let offsetY = 0;
            if (this._coordinateOriginTileIndex) {
                offsetX = this._coordinateOriginTileIndex.x * this._tileCoordinateSize;
                offsetY = this._coordinateOriginTileIndex.y * this._tileCoordinateSize * -1;
            }
            return {x: offsetX, y: offsetY};
        }

        _gameCoordsToMapLatlng(a, b) {
            let x, y;
            if (typeof(a) === 'object') {
                x = a.x;
                y = a.y;
            }
            else {
                x = a;
                y = b;
            }

            const gameCoordsOffset = this._getGameCoordsOffset();
            return [y + gameCoordsOffset.y, x + gameCoordsOffset.x];
        }
    };

    this.createMap = function(mapId, tileData) {
        let map = new BlacksmithMap(mapId);
        if (tileData) {
            map.setTileData(tileData);
        }
        return map;
    };
});
