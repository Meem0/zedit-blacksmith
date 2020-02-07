ngapp.run(function(workflowService, skyrimArmorService, writeObjectToElementService) {
    let {getArmorTypes} = skyrimArmorService;

    let getOrAddFile = function(filename) {
        let fileId = xelib.FileByName(filename);
        if (!fileId) {
            fileId = xelib.AddFile(filename);
        }
        return fileId;
    };

    let finishWorkflow = function(model) {
        xelib.WithHandle(
            getOrAddFile(model.plugin),
            pluginId => {
                xelib.AddAllMasters(pluginId);
                writeObjectToElementService.writeObjectToRecord(pluginId, model.armor);
                xelib.CleanMasters(pluginId);
            }
        );
    };

    workflowService.addWorkflow({
        name: 'makeArmor',
        label: 'Make an Armor Piece',
        image: `${modulePath}/resources/images/Heavy Armor.png`,
        games: [xelib.gmTES5, xelib.gmSSE],
        finish: finishWorkflow,
        stages: [{
            name: 'Select Plugin',
            view: 'pluginSelector'
        }, {
            name: 'Select an Armor Type',
            view: 'tileSelect',
            modelKey: 'armorType',
            tiles: () => {
                return getArmorTypes().map(armorType => ({
                    image: `${moduleUrl}/resources/images/${armorType}.png`,
                    label: armorType
                }));
            }
        }, {
            name: 'Set Armor Attributes',
            view: 'setArmorAttributes'
        }]
    });
});