ngapp.service('skyrimWeaponService', function(blacksmithHelpersService) {
    let weaponTypes = fh.loadJsonFile(`${modulePath}/resources/weaponTypes.json`);
    let weaponAttributes = fh.loadJsonFile(`${modulePath}/resources/weaponAttributes.json`);

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
        return weaponTypes;
    };

    this.getWeaponAttributes = function(weaponType, material) {
        const weaponRecordObject = xelib.WithHandle(
            findItem('WEAP', weaponType, material),
            itemId => blacksmithHelpersService.elementToObject(itemId)
        );
        return Object.copyProperties(weaponRecordObject, weaponAttributes);
    };
});
