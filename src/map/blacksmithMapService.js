module.exports = ({ngapp, fh, modulePath}, blacksmithHelpers) =>
ngapp.service('blacksmithMapService', function(leafletService) {
    let getIconUrl = function(iconFilename) {
        return `${modulePath}\\resources\\map\\icons\\${iconFilename}`;
    };

    let getMapSettingsFromTiledMapSettings = function(map, {mapSize, numZoomLevels}) {
        let leaflet = leafletService.getLeaflet();
        const mapBounds = leaflet.latLngBounds([0, 0], [-mapSize, mapSize]);

        const minZoom = map.getBoundsZoom(mapBounds, /*inside*/ true);
        const maxZoom = minZoom + numZoomLevels - 1;
        
        return {mapBounds, minZoom, maxZoom};
    };

    let getCoordinatesBounds = function(coordinatesList, minBoundsSize = 0, paddingMultiplier = 1.2) {
        let leaflet = leafletService.getLeaflet();
        let bounds = leaflet.bounds(coordinatesList);

        const boundsSize = bounds.getSize();
        const minBoundsDimensions = leaflet.point(Math.max(minBoundsSize, boundsSize.x * paddingMultiplier), Math.max(minBoundsSize, boundsSize.y * paddingMultiplier));
        const minBoundsPadding = minBoundsDimensions.multiplyBy(0.5);

        let boundsCenter = bounds.getCenter();
        bounds.extend(boundsCenter.add(minBoundsPadding));
        bounds.extend(boundsCenter.subtract(minBoundsPadding));
        return bounds;
    };

    class BlacksmithMap {
        constructor(mapId) {
            this._leaflet = leafletService.getLeaflet();
            const mapOpts = {
                crs: this._leaflet.CRS.Simple,
                minZoom: -100
            };
            this.map = this._leaflet.map(mapId, mapOpts);
        }

        initializeBounds() {
            let mapBounds, minZoom, maxZoom;

            if (this._tiledMapSettings) {
                ({mapBounds, minZoom, maxZoom} = getMapSettingsFromTiledMapSettings(this.map, this._tiledMapSettings));
            }
            else {
                const doorsCoordinates = this._doors.map(({coordinates}) => this._leaflet.point(coordinates.x, coordinates.y));
                const coordinatesBounds = getCoordinatesBounds(doorsCoordinates);
                mapBounds = this._leaflet.latLngBounds(this._gameCoordsToMapLatlng(coordinatesBounds.min), this._gameCoordsToMapLatlng(coordinatesBounds.max));
                minZoom = this.map.getBoundsZoom(mapBounds, /*inside*/ false);
                maxZoom = minZoom + 3;

                this._leaflet.imageOverlay(`${modulePath}\\resources\\map\\DefaultBackground.png`, mapBounds).addTo(this.map);
                this._leaflet.polyline([
                    mapBounds.getNorthWest(),
                    mapBounds.getNorthEast(),
                    mapBounds.getSouthEast(),
                    mapBounds.getSouthWest(),
                    mapBounds.getNorthWest()
                ], {color: 'red'}).addTo(this.map);
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
                coordinateOffset: this._leaflet.point(coordinateOriginTileIndex.x * tileCoordinateSize, coordinateOriginTileIndex.y * tileCoordinateSize),
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

            let tileLayer = this._leaflet.tileLayer(tileUrl, tileOpts);
            tileLayer.addTo(this.map);
        }

        setDoors(doors) {
            const doorIconUrl = getIconUrl('Door.png');
            const worldDoorIconUrl = getIconUrl('Door_World.png');
            doors.forEach(door => {
                const isWorldDoor = blacksmithHelpers.runOnReferenceRecord(door.destinationZoneReference, xelib.Signature) === 'WRLD';
                let icon = new this._leaflet.Icon({
                    iconUrl: isWorldDoor ? worldDoorIconUrl : doorIconUrl,
                    iconSize: [20, 36]
                });
                let doorMarker = this.addMarker(icon, this._leaflet.point(door.coordinates.x, door.coordinates.y), door.name);
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
            let markerLatlng = this._gameCoordsToMapLatlng(gameCoords);
            let marker = this._leaflet.marker(markerLatlng, {icon}).addTo(this.map);
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
            let gameCoordsOffset = this._leaflet.point(0, 0);
            if (this._tiledMapSettings) {
                gameCoordsOffset.x = this._tiledMapSettings.coordinateOffset.x;
                gameCoordsOffset.y = this._tiledMapSettings.coordinateOffset.y * -1;
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
