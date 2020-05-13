module.exports = ({ngapp, fh, modulePath}, blacksmithHelpers) =>
ngapp.service('blacksmithMapService', function(leafletService) {
    let getIconUrl = function(iconFilename) {
        return `${modulePath}\\resources\\map\\icons\\${iconFilename}`;
    };

    let getContainerIconData = function(containerReference) {
        let edid = '';
        let name = '';
        blacksmithHelpers.runOnReferenceRecord(containerReference, containerRecord => {
            edid = xelib.EditorID(containerRecord).toLowerCase();
            name = xelib.Name(containerRecord).toLowerCase();
        });
        
        if (name.includes('corpse') || edid.includes('corpse')) {
            return {name: 'Corpses', priority: 110};
        }
        if (edid.includes('merchant')) {
            return {name: 'Merchant Chests', priority: 105};
        }
        if (edid.includes('safe') || edid.includes('strongbox')) {
            return {name: 'Safes', priority: 140};
        }
        if (edid.includes('chest')) {
            if (edid.includes('boss')) {
                return {name: 'Boss Chests', priority: 150};
            }
            return {name: 'Chests', priority: 145};
        }
        if (name.includes('barrel') || edid.includes('barrel')) {
            return {name: 'Barrels', priority: 130};
        }
        if (name.includes('sack') || edid.includes('sack') || name.includes('satchel') || edid.includes('satchel')) {
            return {name: 'Bags', priority: 125};
        }
        if (name.includes('cupboard') || name.includes('table') || name.includes('wardrobe') || name.includes('dresser')) {
            return {name: 'Furniture', priority: 120};
        }
        if (name.includes('urn') || name.includes('pot')) {
            return {name: 'Pottery', priority: 115};
        }
        return {name: 'Other Containers', priority: 100};
    };

    let getMapSettingsFromTiledMapSettings = function(map, {pixelSize, mapSize, numZoomLevels}) {
        let leaflet = leafletService.getLeaflet();
        const mapBounds = leaflet.latLngBounds([0, 0], [-mapSize, mapSize]);

        const minZoom = Math.log2(pixelSize / mapSize);
        const maxZoom = minZoom + numZoomLevels - 1;
        
        return {mapBounds, minZoom, maxZoom};
    };

    let getPaddedCoordinatesBounds = function(coordinatesBounds, minBoundsSize = 0, paddingMultiplier = 1) {
        let leaflet = leafletService.getLeaflet();

        const boundsSize = coordinatesBounds.getSize();
        const minBoundsDimensions = leaflet.point(Math.max(minBoundsSize, boundsSize.x * paddingMultiplier), Math.max(minBoundsSize, boundsSize.y * paddingMultiplier));
        const minBoundsPadding = minBoundsDimensions.multiplyBy(0.5);

        let boundsCenter = coordinatesBounds.getCenter();
        coordinatesBounds.extend(boundsCenter.add(minBoundsPadding));
        coordinatesBounds.extend(boundsCenter.subtract(minBoundsPadding));
        return coordinatesBounds;
    };

    class BlacksmithMap {
        constructor(mapId) {
            this._leaflet = leafletService.getLeaflet();
            const mapOpts = {
                crs: this._leaflet.CRS.Simple,
                minZoom: -100
            };
            this.map = this._leaflet.map(mapId, mapOpts);
            this._markerGroups = [];
        }

        initializeMap() {
            let mapBounds, minZoom, maxZoom;

            if (this._tiledMapSettings) {
                ({mapBounds, minZoom, maxZoom} = getMapSettingsFromTiledMapSettings(this.map, this._tiledMapSettings));
            }
            else {
                let minGameCoordinatesBounds = this._leaflet.bounds([]);
                this._markerGroups.forEach(({markerData}) => {
                    markerData.forEach(({gameCoordinates}) => minGameCoordinatesBounds.extend(gameCoordinates));
                });
                const paddedGameCoordinatesBounds = getPaddedCoordinatesBounds(minGameCoordinatesBounds, 1000, 1.2);
                mapBounds = this._leaflet.latLngBounds(this._gameCoordsToMapLatlng(paddedGameCoordinatesBounds.min), this._gameCoordsToMapLatlng(paddedGameCoordinatesBounds.max));
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

            if (this._markerGroups.length > 0) {
                this._markerGroups.sort((a, b) => {
                    return b.priority - a.priority;
                });

                const defaultMaxMarkers = 600;
                let currentTotalMarkers = 0;

                let layerGroups = this._markerGroups.reduce((layerGroups, {name, priority, iconSize, markerData}) => {
                    const iconUrl = getIconUrl(name + '.png')
                    let icon = this._leaflet.icon({
                        iconUrl,
                        iconSize
                    });

                    let markers = markerData.map(({gameCoordinates, tooltipText, onClick}) => {
                        let markerLatlng = this._gameCoordsToMapLatlng(gameCoordinates);
                        let marker = this._leaflet.marker(markerLatlng, {
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

                    currentTotalMarkers += markers.length;
                    if (currentTotalMarkers <= defaultMaxMarkers) {
                        layerGroup.addTo(this.map);
                    }

                    let groupLabel = `<img src='${iconUrl}' height='20' width='20'> ${name} (${markers.length})`;

                    layerGroups[groupLabel] = layerGroup;
                    return layerGroups
                }, {});

                this._leaflet.control.layers(null, layerGroups).addTo(this.map);
            }

            this.map.setMaxBounds(mapBounds);
            this.map.setMinZoom(minZoom);
            this.map.setMaxZoom(maxZoom);
            this.map.setView([0, 0], minZoom);
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

            this._tiledMapSettings = {
                coordinateOffset: this._leaflet.point(coordinateOriginTileIndex.x * tileCoordinateSize, coordinateOriginTileIndex.y * tileCoordinateSize),
                pixelSize: tilePixelSize * tileGridLength,
                mapSize: tileCoordinateSize * tileGridLength,
                numZoomLevels
            };

            const {mapBounds, minZoom, maxZoom} = getMapSettingsFromTiledMapSettings(this.map, this._tiledMapSettings);

            const tileOpts = {
                bounds: mapBounds,
                tileSize: tilePixelSize,
                minZoom,
                maxZoom,
                zoomOffset: tileDataMinZoom - minZoom
            };
            const tileUrl = zoomDirJp.cwd() + '\\zoom{z}\\' + tileFormat;

            let tileLayer = this._leaflet.tileLayer(tileUrl, tileOpts);
            tileLayer.addTo(this.map);
        }

        setDoors(doors) {
            let worldDoorMarkers = [];
            let doorMarkers = [];

            doors.forEach(door => {
                const isWorldDoor = blacksmithHelpers.runOnReferenceRecord(door.destinationZoneReference, xelib.Signature) === 'WRLD';
                (isWorldDoor ? worldDoorMarkers : doorMarkers).push({
                    gameCoordinates: this._leaflet.point(door.coordinates.x, door.coordinates.y),
                    tooltipText: door.destinationZoneName,
                    onClick: () => {
                        if (this._onDoorSelectedCb) {
                            this._onDoorSelectedCb(door);
                        }
                    }
                });
            });

            if (worldDoorMarkers.length > 0) {
                this._markerGroups.push({
                    name: 'World Doors',
                    priority: 170,
                    iconSize: [32, 32],
                    markerData: worldDoorMarkers
                });
            }
            if (doorMarkers.length > 0) {
                this._markerGroups.push({
                    name: 'Doors',
                    priority: 160,
                    iconSize: [32, 32],
                    markerData: doorMarkers
                });
            }
        }

        setContainers(containers) {
            let containerMarkerGroups = {};

            containers.forEach(container => {
                let {name, priority} = getContainerIconData(container.contReference);

                let containerMarkerGroup = containerMarkerGroups[name];
                if (!containerMarkerGroup) {
                    containerMarkerGroup = {
                        name,
                        priority,
                        iconSize: [24, 24],
                        markerData: []
                    };
                    containerMarkerGroups[name] = containerMarkerGroup;
                }

                containerMarkerGroup.markerData.push({
                    gameCoordinates: this._leaflet.point(container.coordinates.x, container.coordinates.y),
                    tooltipText: container.name,
                    onClick: () => {
                        if (this._onContainerSelectedCb) {
                            this._onContainerSelectedCb(container);
                        }
                    }
                });
            });

            Object.values(containerMarkerGroups).forEach(containerMarkerGroup => this._markerGroups.push(containerMarkerGroup));
        }

        remove() {
            this.map.remove();
        }

        registerOnDoorSelected(cb) {
            this._onDoorSelectedCb = cb;
        }

        registerOnContainerSelected(cb) {
            this._onContainerSelectedCb = cb;
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

    this.createMap = function(mapId, {tileData, doors, containers} = {}) {
        let map = new BlacksmithMap(mapId);
        if (tileData) {
            map.setTileData(tileData);
        }
        if (doors) {
            map.setDoors(doors);
        }
        if (containers) {
            map.setContainers(containers);
        }
        map.initializeMap();
        return map;
    };
});
