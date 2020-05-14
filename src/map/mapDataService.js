module.exports = ({ngapp}, blacksmithHelpers) =>
ngapp.service('mapDataService', function() {
    let buildRefrObjects = function(zoneReference, refrType, buildRefrObject) {
        return blacksmithHelpers.runOnReferenceRecord(zoneReference, zoneRecord => {
            return xelib.WithHandles(xelib.GetREFRs(zoneRecord, refrType), refrRecords => {
                return refrRecords.reduce((refrObjects, refrRecord) => {
                    let refrObject = buildRefrObject(refrRecord);
                    if (refrObject) {
                        refrObjects.push(refrObject);
                    }
                    return refrObjects;
                }, []);
            });
        });
    };

    let resolveDestinationZone = function(doorRecord) {
        if (!xelib.HasElement(doorRecord, 'XTEL')) {
            return 0;
        }
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

    let doorCache = {};
    
    this.getDoors = function(zoneReference) {
        let doors = doorCache[zoneReference];
        if (!doors) {
            doors = buildRefrObjects(zoneReference, 'DOOR', doorRefrRecord => {
                return xelib.WithHandle(resolveDestinationZone(doorRefrRecord), destinationZoneRecord => {
                    if (!destinationZoneRecord) {
                        return;
                    }
                    return {
                        name: xelib.Name(destinationZoneRecord),
                        coordinates: {
                            x: xelib.GetFloatValue(doorRefrRecord, 'DATA\\Position\\X'),
                            y: xelib.GetFloatValue(doorRefrRecord, 'DATA\\Position\\Y')
                        },
                        destinationZoneReference: blacksmithHelpers.getReferenceFromRecord(destinationZoneRecord),
                        reference: blacksmithHelpers.getReferenceFromRecord(doorRefrRecord)
                    };
                });
            });
            doorCache[zoneReference] = doors;
        }
        return doors;
    };

    let containerCache = {};

    this.getContainers = function(zoneReference) {
        let containers = containerCache[zoneReference];
        if (!containers) {
            containers = buildRefrObjects(zoneReference, 'CONT', contRefrRecord => {
                return xelib.WithHandle(xelib.GetLinksTo(contRefrRecord, 'NAME'), contRecord => {
                    if (!contRecord) {
                        return;
                    }
                    return {
                        name: xelib.Name(contRecord),
                        coordinates: {
                            x: xelib.GetFloatValue(contRefrRecord, 'DATA\\Position\\X'),
                            y: xelib.GetFloatValue(contRefrRecord, 'DATA\\Position\\Y')
                        },
                        contReference: blacksmithHelpers.getReferenceFromRecord(contRecord),
                        reference: blacksmithHelpers.getReferenceFromRecord(contRefrRecord)
                    };
                });
            });
            containerCache[zoneReference] = containers;
        }
        return containers;
    };
});
