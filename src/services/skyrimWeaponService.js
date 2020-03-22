ngapp.service('skyrimWeaponService', function(elementSchemaService, jsonService) {
    let weaponTypes = jsonService.loadJsonFile('weaponTypes');

    let getEditorId = function(fileId, weaponType, material) {
        let prefix = '';
        if (xelib.GetFileName(fileId) === 'Dawnguard.esm') {
            prefix = 'DLC1';
        }
        return prefix + (material + weaponType).toPascalCase();
    };

    let findItem = function(signature, weaponType, material) {
        let itemId = 0;
        xelib.WithEachHandle(
            xelib.GetElements(0, ''),
            fileId => {
                if (itemId === 0) {
                    const edid = getEditorId(fileId, weaponType, material);
                    itemId = xelib.GetElement(fileId, signature + '\\' + edid);
                }
            }
        );
        return itemId;
    };

    this.getWeaponTypes = function() {
        return Object.keys(weaponTypes);
    };

    this.getWeaponAttributes = function(weaponType, material) {
        const weaponRecordObject = xelib.WithHandle(
            findItem('WEAP', weaponType, material),
            itemId => blacksmithHelpers.elementToObject(itemId)
        );
        return elementSchemaService.process(weaponRecordObject, 'weaponTemplateSchema');
    };
});
