ngapp.service('skyrimArmorService', function(blacksmithHelpersService, elementSchemaService) {
    let armorTypes = fh.loadJsonFile(`${modulePath}/resources/armorTypes.json`);

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
        return blacksmithHelpersService.findElementInFiles(path);
    };

    this.getArmorTypes = function() {
        return Object.keys(armorTypes);
    };

    this.getArmorAttributes = function(armorType, material) {
        const armorRecordObject = xelib.WithHandle(
            findItem('ARMO', armorType, material),
            itemId => blacksmithHelpersService.elementToObject(itemId)
        );
        return elementSchemaService.process(armorRecordObject, 'armorTemplateSchema');
    };
});
