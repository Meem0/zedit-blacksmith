module.exports = ({ngapp, fh, modulePath}, blacksmithHelpers) =>
ngapp.service('blacksmithMapService', function(leafletService) {
    let getIconUrl = function(iconFilename) {
        return `${modulePath}\\resources\\map\\icons\\${iconFilename}`;
    };

    let getMapSettingsFromTiledMapSettings = function(map, {mapSize, numZoomLevels}) {
        const mapBounds = [[0, 0], [-mapSize, mapSize]];

        const minZoom = map.getBoundsZoom(mapBounds, /*inside*/ true);
        const maxZoom = minZoom + numZoomLevels - 1;
        
        return {mapBounds, minZoom, maxZoom};
    }

    let getCoordinatesBounds = function(coordinatesList) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        coordinatesList.forEach(({x, y}) => {
            if (x < minX) {
                minX = x;
            }
            if (x > maxX) {
                maxX = x;
            }
            if (y < minY) {
                minY = y;
            }
            if (y > maxY) {
                maxY = y;
            }
        });
        let makeFinite = num => Number.isFinite(num) ? num : 0;
        return {
            min: {
                x: makeFinite(minX),
                y: makeFinite(minY)
            },
            max: {
                x: makeFinite(maxX),
                y: makeFinite(maxY)
            }
        };
    }

    class BlacksmithMap {
        constructor(mapId) {
            let leaflet = leafletService.getLeaflet();
            const mapOpts = {
                crs: leaflet.CRS.Simple,
                minZoom: -100
            };
            this.map = leaflet.map(mapId, mapOpts);
        }

        initializeBounds() {
            let mapBounds, minZoom, maxZoom;

            if (this._tiledMapSettings) {
                ({mapBounds, minZoom, maxZoom} = getMapSettingsFromTiledMapSettings(this.map, this._tiledMapSettings));
            }
            else {
                const doorsCoordinates = this._doors.map(({coordinates}) => coordinates);
                const coordinatesBounds = getCoordinatesBounds(doorsCoordinates);
                mapBounds = [this._gameCoordsToMapLatlng(coordinatesBounds.min), this._gameCoordsToMapLatlng(coordinatesBounds.max)];
                minZoom = this.map.getBoundsZoom(mapBounds, /*inside*/ false);
                maxZoom = minZoom + 3;
            }

            this.map.setMaxBounds(mapBounds);
            this.map.setMinZoom(minZoom);
            this.map.setMaxZoom(maxZoom);
            this.map.setView([0, 0], minZoom);
        }

        setTileData({zoomLevelsDir, tileFormat, tileCoordinateSize, tileGridLength, coordinateOriginTileIndex}) {
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

            this._tiledMapSettings = {
                coordinateOffset: {
                    x: coordinateOriginTileIndex.x * tileCoordinateSize,
                    y: coordinateOriginTileIndex.y * tileCoordinateSize
                },
                mapSize: tileCoordinateSize * tileGridLength,
                numZoomLevels
            };

            const {mapBounds, minZoom, maxZoom} = getMapSettingsFromTiledMapSettings(this.map, this._tiledMapSettings);

            const tileOpts = {
                bounds: mapBounds,
                minZoom,
                maxZoom,
                zoomOffset: tileDataMinZoom - minZoom
            };
            const tileUrl = zoomDirJp.cwd() + '\\zoom{z}\\' + tileFormat;

            let leaflet = leafletService.getLeaflet();
            let tileLayer = leaflet.tileLayer(tileUrl, tileOpts);
            tileLayer.addTo(this.map);
        }

        setDoors(doors) {
            let leaflet = leafletService.getLeaflet();
            const doorIconUrl = getIconUrl('Door.png');
            const worldDoorIconUrl = getIconUrl('Door_World.png');
            doors.forEach(door => {
                const isWorldDoor = blacksmithHelpers.runOnReferenceRecord(door.destinationZoneReference, xelib.Signature) === 'WRLD';
                let icon = new leaflet.Icon({
                    iconUrl: isWorldDoor ? worldDoorIconUrl : doorIconUrl,
                    iconSize: [20, 36]
                });
                let doorMarker = this.addMarker(icon, door.coordinates, door.name);
                if (doorMarker) {
                    doorMarker.on('click', () => {
                        if (this._onDoorSelectedCb) {
                            this._onDoorSelectedCb(door);
                        }
                    });
                }
            });
            
            this._doors = doors;
        }

        addMarker(icon, gameCoords, name) {
            let leaflet = leafletService.getLeaflet();

            let markerLatlng = this._gameCoordsToMapLatlng(gameCoords);
            let marker = leaflet.marker(markerLatlng, {icon}).addTo(this.map);
            if (name) {
                marker.bindPopup(name);
            }
            return marker;
        }

        remove() {
            this.map.remove();
        }

        registerOnDoorSelected(cb) {
            this._onDoorSelectedCb = cb;
        }

        _getGameCoordsOffset() {
            let offsetX = 0;
            let offsetY = 0;
            if (this._tiledMapSettings) {
                offsetX = this._tiledMapSettings.coordinateOffset.x;
                offsetY = this._tiledMapSettings.coordinateOffset.y * -1;
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

        _mapLatlngToGameCoords(a, b) {
            let lat, lng;
            if (Array.isArray(a)) {
                ([lat, lng] = a);
            }
            else if (typeof(a) === 'object') {
                ({lat, lng} = a);
            }
            else {
                lat = a;
                lng = b;
            }

            const gameCoordsOffset = this._getGameCoordsOffset();
            return {
                x: lng - gameCoordsOffset.x,
                y: lat - gameCoordsOffset.y
            };
        }
    };

    this.createMap = function(mapId, {tileData, doors} = {}) {
        let map = new BlacksmithMap(mapId);
        if (tileData) {
            map.setTileData(tileData);
        }
        if (doors) {
            map.setDoors(doors);
        }
        map.initializeBounds();
        return map;
    };
});
