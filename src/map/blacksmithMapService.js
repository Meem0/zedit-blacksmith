module.exports = ({ngapp, fh, modulePath}, blacksmithHelpers) =>
ngapp.service('blacksmithMapService', function(leafletService) {
    let getIconUrl = function(iconFilename) {
        return `${modulePath}\\resources\\map\\icons\\${iconFilename}`;
    };

    let getMapBoundsSettings = function(map, bounds) {
        const mapBounds = bounds.pad(0.2);
        const minZoom = map.getBoundsZoom(mapBounds, /*inside*/ false);
        return {
            mapBounds,
            minZoom,
            maxZoom: minZoom + 3
        };
    };

    let addDefaultBackgroundToMap = function(map, bounds) {
        let leaflet = leafletService.getLeaflet();

        leaflet.imageOverlay(`${modulePath}\\resources\\map\\DefaultBackground.png`, bounds).addTo(map);
        leaflet.polyline([
            bounds.getNorthWest(),
            bounds.getNorthEast(),
            bounds.getSouthEast(),
            bounds.getSouthWest(),
            bounds.getNorthWest()
        ], {color: 'red'}).addTo(map);
    };

    class BlacksmithMap {
        constructor() {
            this._leaflet = leafletService.getLeaflet();
            this._markerGroups = [];
            this._layerGroups = {};
        }

        createMap(mapId) {
            const mapOpts = {
                crs: this._leaflet.CRS.Simple,
                minZoom: -100
            };
            this.map = this._leaflet.map(mapId, mapOpts);

            let {mapBounds, minZoom, maxZoom} = this._tiledMapBoundsSettings || getMapBoundsSettings(this.map, this._markerMinBounds);

            if (this._tileLayer) {
                this._tileLayer.addTo(this.map);
            }
            else {
                addDefaultBackgroundToMap(this.map, mapBounds);
            }

            const defaultMaxLayers = 600;
            let currentTotalLayers = 0;
            for (let layerGroup of Object.values(this._layerGroups)) {
                currentTotalLayers += layerGroup.getLayers().length;
                if (currentTotalLayers > defaultMaxLayers) {
                    break;
                }
                layerGroup.addTo(this.map);
            }
            this._leaflet.control.layers(null, this._layerGroups).addTo(this.map);
            
            this.map.setMaxBounds(mapBounds.pad(0.2));
            this.map.setMinZoom(minZoom);
            this.map.setMaxZoom(maxZoom);
            this.map.setView(mapBounds.getCenter(), minZoom);
        }

        setTileData({zoomLevelsDir, tileFormat, tilePixelSize, tileCoordinateSize, tileGridLength, coordinateOriginTileIndex}) {
            const zoomDirJp = fh.jetpack.cwd(zoomLevelsDir);
            const zoomDirs = zoomDirJp.list().filter(dir => dir.startsWith('zoom'));
            const numZoomLevels = zoomDirs.length;

            const tileDataMinZoom = zoomDirs.reduce((minZoom, dir) => {
                const num = Number.parseInt(dir.substring(4));
                if (num < minZoom) {
                    minZoom = num;
                }
                return minZoom;
            }, 100);

            const tiledMapPixelSize = tilePixelSize * tileGridLength;
            const tiledMapGameCoordinatesSize = tileCoordinateSize * tileGridLength;
            const minZoom = Math.log2(tiledMapPixelSize / tiledMapGameCoordinatesSize);

            this._tiledMapBoundsSettings = {
                mapBounds: this._leaflet.latLngBounds([0, 0], [-tiledMapGameCoordinatesSize, tiledMapGameCoordinatesSize]),
                minZoom,
                maxZoom: minZoom + numZoomLevels - 1
            };

            this._tiledMapCoordinateOffset = this._leaflet.point(coordinateOriginTileIndex.x * tileCoordinateSize, coordinateOriginTileIndex.y * tileCoordinateSize);

            const tileOpts = {
                bounds: this._tiledMapBoundsSettings.mapBounds,
                tileSize: tilePixelSize,
                minZoom,
                maxZoom: this._tiledMapBoundsSettings.maxZoom,
                zoomOffset: tileDataMinZoom - minZoom
            };
            const tileUrl = zoomDirJp.cwd() + '\\zoom{z}\\' + tileFormat;

            this._tileLayer = this._leaflet.tileLayer(tileUrl, tileOpts);
        }

        setMarkerGroups(markerGroups) {
            this._markerMinBounds = this._leaflet.latLngBounds([]);

            markerGroups.sort((a, b) => {
                return b.priority - a.priority;
            });

            markerGroups.forEach(({name, priority, iconSize, markerData}) => {
                const iconUrl = getIconUrl(name + '.png')
                let icon = this._leaflet.icon({
                    iconUrl,
                    iconSize
                });

                let markers = markerData.map(({gameCoordinates, tooltipText, onClick}) => {
                    let markerLatLng = this._gameCoordsToMapLatlng(this._leaflet.point(gameCoordinates.x, gameCoordinates.y));
                    this._markerMinBounds.extend(markerLatLng);

                    let marker = this._leaflet.marker(markerLatLng, {
                        icon,
                        zIndexOffset: priority,
                        riseOnHover: true
                    });
                    if (tooltipText) {
                        marker.bindTooltip(tooltipText);
                    }
                    if (onClick) {
                        marker.on('click', onClick);
                    }
                    return marker;
                });

                let layerGroup = this._leaflet.layerGroup(markers);
                let groupLabel = `<img src='${iconUrl}' height='20' width='20'> ${name} (${markers.length})`;
                this._layerGroups[groupLabel] = layerGroup;
            }, {});
        }

        remove() {
            this.map.remove();
        }

        _getGameCoordsOffset() {
            let gameCoordsOffset = this._leaflet.point(0, 0);
            if (this._tiledMapCoordinateOffset) {
                gameCoordsOffset.x = this._tiledMapCoordinateOffset.x;
                gameCoordsOffset.y = this._tiledMapCoordinateOffset.y * -1;
            }
            return gameCoordsOffset;
        }

        _gameCoordsToMapLatlng(gameCoords) {
            const gameCoordsOffset = this._getGameCoordsOffset();
            const offsetGameCoords = gameCoordsOffset.add(gameCoords);
            return this._leaflet.latLng(offsetGameCoords.y, offsetGameCoords.x);
        }

        _mapLatlngToGameCoords(mapLatLng) {
            const gameCoordsOffset = this._getGameCoordsOffset();
            const gameCoords = this._leaflet.point(mapLatLng.lng, mapLatLng.lat);
            return gameCoords.subtract(gameCoordsOffset);
        }
    };

    this.createMap = function(mapId, {tileData, markerGroups} = {}) {
        let map = new BlacksmithMap(mapId);
        if (tileData) {
            map.setTileData(tileData);
        }
        if (markerGroups) {
            map.setMarkerGroups(markerGroups);
        }
        map.createMap(mapId);
        return map;
    };
});
