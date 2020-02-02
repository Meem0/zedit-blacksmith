ngapp.service('skyrimArmorService', function(blacksmithHelpersService, elementSchemaService) {
    let armorTypes = fh.loadJsonFile(`${modulePath}/resources/armorTypes.json`);

    let getEditorId = function(fileId, armorType, material) {
        let prefix = 'Armor';

        let editorIdMaterialType = material;
        if (material.toLowerCase() === 'steel') {
            editorIdMaterialType = 'SteelPlate';
        }

        let editorIdArmorType = armorType;
        if (armorType.toLowerCase() === 'armor') {
            editorIdArmorType = 'Cuirass';
        }

        return prefix + (editorIdMaterialType + editorIdArmorType).toPascalCase();
    };

    let findItem = function(signature, armorType, material) {
        let itemId = 0;
        xelib.WithHandles(
            xelib.GetElements(0, ''),
            fileIds => {
                for (const fileId of fileIds) {
                    const edid = getEditorId(fileId, armorType, material);
                    itemId = xelib.GetElement(fileId, signature + '\\' + edid);
                    if (itemId !== 0) {
                        break;
                    }
                }
            }
        );
        return itemId;
    };

    this.getArmorTypes = function() {
        return armorTypes;
    };

    this.getArmorAttributes = function(armorType, material) {
        const armorRecordObject = xelib.WithHandle(
            findItem('ARMO', armorType, material),
            itemId => blacksmithHelpersService.elementToObject(itemId)
        );
        return elementSchemaService.process(armorRecordObject, 'armorTemplateSchema');
    };
});
