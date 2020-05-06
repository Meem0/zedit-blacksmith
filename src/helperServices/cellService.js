module.exports = ({ngapp}, blacksmithHelpers) =>
ngapp.service('cellService', function() {
    let {GetElement, GetIntValue, HasElement, GetRecords, 
        GetLinksTo, GetElements, Name} = xelib;
    
    // private functions
    let getWorldspaceDimensions = worldspace => {
       let coords = GetElement(worldspace, 'MNAM\\Cell Coordinates');
       return {
           minX: GetIntValue(coords, 'NW Cell\\X'),
           maxX: GetIntValue(coords, 'SE Cell\\X'),
           minY: GetIntValue(coords, 'SE Cell\\Y'),
           maxY: GetIntValue(coords, 'NW Cell\\Y')
       };
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
       record: worldspace,
       dimensions: getWorldspaceDimensions(worldspace)
    });
    
    let exteriorCellFilter = function(worldspace) {
       let {minX, maxX, minY, maxY} = worldspace.dimensions;
       return (exteriorCell) => {
           let {x, y} = getCellCoordinates(exteriorCell);
           return x >= minX && x <= maxX &&
               y >= minY && y <= maxY;
       };
    }
    
    let makeExteriorCellObject = exteriorCell => ({
       name: Name(exteriorCell),
       recordType: 'exterior cell',
       record: exteriorCell,
       coordinates: getCellCoordinates(exteriorCell)
    });
    
    let GetDoors = exteriorCell => {
       let navmeshes = GetRecords(exteriorCell, 'NAVM');
       return navmeshes.reduce((doors, navmesh) => {
           let doorTriangles = GetElements(navmesh, 'NVNM\\Door Triangles');
           doorTriangles.forEach(doorTriangle => {
               let doorRef = GetLinksTo(doorTriangle, 'Door');
               if (doorRef) doors.push(doorRef);
           });
           return doors;
       }, []);
    };
    
    let resolveDestinationCell = door => {
       let linkedDoor = GetLinksTo(door, 'XTEL\\Door');
       if (!linkedDoor) return 0;
       return GetLinksTo(linkedDoor, 'Cell');
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
        return GetRecords(worldspace.record, 'CELL')
            .filter(exteriorCellFilter(worldspace))
            .map(makeExteriorCellObject);
    };

    this.getInteriorCells = function(exteriorCell) {
        return GetDoors(exteriorCell.record)
            .map(resolveDestinationCell)
            .map(makeInteriorCellObject);
    };
});
