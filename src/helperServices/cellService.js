module.exports = ({ngapp}, blacksmithHelpers) =>
ngapp.service('cellService', function() {
    let {GetElement, GetIntValue, HasElement, GetRecords, 
        GetLinksTo, GetElements, Name, WithHandle, WithHandles} = xelib;
    
    // private functions
    let getWorldspaceDimensions = worldspace => {
        return WithHandle(GetElement(worldspace, 'MNAM\\Cell Coordinates'), coords => {
            return {
                minX: coords ? GetIntValue(coords, 'NW Cell\\X') : 0,
                maxX: coords ? GetIntValue(coords, 'SE Cell\\X') : 0,
                minY: coords ? GetIntValue(coords, 'SE Cell\\Y') : 0,
                maxY: coords ? GetIntValue(coords, 'NW Cell\\Y') : 0
            };
        });
    };
    
    let getCellCoordinates = exteriorCell => {
        let x = GetIntValue(exteriorCell, 'XCLC\\X'),
            y = GetIntValue(exteriorCell, 'XCLC\\Y');
        return { x, y };
    };
    
    let worldspaceFilter = worldspace => HasElement(worldspace, 'FULL');
    
    let makeWorldspaceObject = worldspace => ({
        name: Name(worldspace),
        recordType: 'worldspace',
        reference: blacksmithHelpers.getReferenceFromRecord(worldspace),
        dimensions: getWorldspaceDimensions(worldspace)
    });
    
    let exteriorCellFilter = function(worldspace) {
        let {minX, maxX, minY, maxY} = worldspace.dimensions;
        return (exteriorCell) => {
            let {x, y} = getCellCoordinates(exteriorCell);
            return x >= minX && x <= maxX && y >= minY && y <= maxY;
        };
    }
    
    let makeExteriorCellObject = exteriorCell => ({
        name: Name(exteriorCell),
        recordType: 'exterior cell',
        record: exteriorCell,
        coordinates: getCellCoordinates(exteriorCell)
    });
    
    let getCellDoors = cellRecord => {
        return WithHandles(GetRecords(cellRecord, 'NAVM'), navmeshes => {
            return navmeshes.reduce((doors, navmesh) => {
                WithHandles(GetElements(navmesh, 'NVNM\\Door Triangles'), doorTriangles => {
                    doorTriangles.forEach(doorTriangle => {
                        let doorRef = GetLinksTo(doorTriangle, 'Door');
                        if (doorRef) {
                            doors.push(doorRef);
                        }
                    });
                });
                return doors;
            }, []);
        });
    };

    let makeDoorObject = doorRecord => {
        return {
            record: doorRecord
        };
    };
    
    let resolveDestinationCell = door => {
        return WithHandle(GetLinksTo(door, 'XTEL\\Door'), linkedDoor => {
            return linkedDoor ? GetLinksTo(linkedDoor, 'Cell') : 0;
        });
    };
    
    let makeInteriorCellObject = interiorCell => ({
        name: Name(interiorCell),
        recordType: 'interior cell',
        record: interiorCell
    });

    // public api
    this.getWorldspaces = function() {
        return GetRecords(0, 'WRLD')
            .filter(worldspaceFilter)
            .map(makeWorldspaceObject);
    };

    this.getExteriorCells = function(worldspace) {
        return blacksmithHelpers.runOnReferenceRecord(worldspaceRecord => GetRecords(worldspaceRecord, 'CELL'))
            .filter(exteriorCellFilter(worldspace))
            .map(makeExteriorCellObject);
    };

    this.getInteriorCells = function(exteriorCell) {
        return getCellDoors(exteriorCell.record)
            .map(resolveDestinationCell)
            .map(makeInteriorCellObject);
    };

    this.getDoors = function(zone) {
        if (zone.recordType === 'worldspace') {
            const exteriorCells = this.getExteriorCells(zone);
            return exteriorCells.reduce((doors, exteriorCell) => {
                return doors.concat(getCellDoors(exteriorCell.record).map(makeDoorObject));
            }, []);
        }
    };
});
