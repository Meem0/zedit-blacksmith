ngapp.run(function(workflowService, writeObjectToElementService) {
    let createWeaponRecord = function(weapon, pluginId) {
        let weaponObject = {
            "Record Header": {
                "Signature": "WEAP"
            },
            "EDID": weapon.editorId,
            "FULL": weapon.name
        };
        weapon.attributes.forEach(attribute => attribute.addToRecordObject(weaponObject));
        return weaponObject;
    };

    let getOrAddFile = function(filename) {
        let fileId = xelib.FileByName(filename);
        if (!fileId) {
            fileId = xelib.AddFile(filename);
        }
        return fileId;
    };

    let finishWorkflow = function(model) {
        const makeWeapons = model.gearCategory === 'weapon';
        const makeArmors = model.gearCategory === 'armor';

        if (!makeWeapons && !makeArmors) {
            return;
        }

        xelib.WithHandle(
            getOrAddFile(model.plugin),
            pluginId => {
                if (!pluginId) {
                    return;
                }

                xelib.AddAllMasters(pluginId);
                model.items.forEach(item => {
                    if (makeWeapons) {
                        createWeaponRecord(item, pluginId);
                    }
                });
                xelib.CleanMasters(pluginId);
            }
        );
    };

    workflowService.addWorkflow({
        name: 'makeWeapons',
        label: 'Make Weapons',
        image: `${modulePath}/resources/images/Sword.png`,
        games: [xelib.gmTES5, xelib.gmSSE],
        start: () => ({gearCategory: 'weapon'}),
        finish: finishWorkflow,
        stages: [{
            name: 'Select Weapons',
            view: 'selectGear'
        }, {
            name: 'Select Plugin',
            view: 'pluginSelector'
        }]
    });
});