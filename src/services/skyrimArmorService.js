ngapp.service('skyrimArmorService', function(elementSchemaService, jsonService) {
    let armorTypes = jsonService.loadJsonFile('armorTypes');

    let getEditorId = function(armorType, material) {
        let prefix = 'Armor';
        let suffix = '';

        if (material.toLowerCase() === 'steel') {
            suffix = 'A';
        }

        let editorIdArmorType = armorType;
        if (armorType.toLowerCase() === 'armor') {
            editorIdArmorType = 'Cuirass';
        }

        return prefix + (material + editorIdArmorType).toPascalCase() + suffix;
    };

    let findItem = function(signature, armorType, material) {
        const edid = getEditorId(armorType, material);
        const path = signature + '\\' + edid;
        return blacksmithHelpers.findElementInFiles(path);
    };

    this.getArmorTypes = function() {
        return Object.keys(armorTypes);
    };

    this.getArmorAttributes = function(armorType, material) {
        const armorRecordObject = xelib.WithHandle(
            findItem('ARMO', armorType, material),
            itemId => blacksmithHelpers.elementToObject(itemId)
        );
        return elementSchemaService.process(armorRecordObject, 'armorTemplateSchema');
    };
});
