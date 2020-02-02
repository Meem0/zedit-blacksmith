ngapp.run(function(workflowService, skyrimWeaponService, writeObjectToElementService) {
    let {getWeaponTypes} = skyrimWeaponService;

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
                writeObjectToElementService.writeObjectToRecord(pluginId, model.weapon);
                xelib.CleanMasters(pluginId);
            }
        );
    };

    workflowService.addWorkflow({
        name: 'makeWeapon',
        label: 'Make a Weapon',
        image: `${modulePath}/resources/images/Sword.png`,
        games: [xelib.gmTES5, xelib.gmSSE],
        finish: finishWorkflow,
        stages: [{
            name: 'Select Plugin',
            view: 'pluginSelector'
        }, {
            name: 'Select a Weapon Type',
            view: 'tileSelect',
            modelKey: 'weaponType',
            tiles: () => {
                return getWeaponTypes().map(weaponType => ({
                    image: `${moduleUrl}/resources/images/${weaponType}.png`,
                    label: weaponType
                }));
            }
        }, {
            name: 'Set Weapon Attributes',
            view: 'setWeaponAttributes'
        }/*, {
            name: 'Select Options',
            view: 'optionSelector',
            options: [{
                image: `${moduleUrl}/resources/images/craftable.png`,
                label: 'Craftable',
                stage: 'Construction Recipes'
            }, {
                image: `${moduleUrl}/resources/images/temperable.png`,
                label: 'Temperable',
                stage: 'Tempering Recipes'
            }, {
                image: `${moduleUrl}/resources/images/destructible.png`,
                label: 'Destructible',
                stage: 'Breakdown Recipes'
            }, {
                image: `${moduleUrl}/resources/images/enchantable.png`,
                label: 'Enchantable',
                stage: 'Enchanted Variants'
            }]
        }, {
            name: 'Construction Recipes',
            view: 'setConstructionOptions',
            optional: true
        }, {
            name: 'Tempering Recipes',
            view: 'setTemperingOptions',
            optional: true
        }, {
            name: 'Breakdown Recipes',
            view: 'setBreakdownOptions',
            optional: true
        }, {
            name: 'Enchanted Variants',
            view: 'setEnchantingOptions',
            optional: true
        }, {
            name: 'Review',
            view: 'reviewWeapon'
        }*/]
    });
});