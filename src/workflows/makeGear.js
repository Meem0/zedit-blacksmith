ngapp.run(function(workflowService, writeObjectToElementService) {
    let setDeep = function(obj, val, keys) {
        if (keys.length > 1) {
            const key = keys.shift();
            if (!obj[key]) {
                obj[key] = {};
            }
            setDeep(obj[key], val, keys);
        }
        else if (keys.length === 1) {
            obj[keys[0]] = val;
        }
    };

    let createWeaponRecord = function(weapon, pluginId) {
        let weaponObject = {
            "Record Header": {
                "Signature": "WEAP"
            },
            "EDID": weapon.editorId,
            "FULL": weapon.name
        };
        Object.values(weapon.attributes).forEach(({value, keyPath}) => setDeep(weaponObject, value, keyPath));
        return weaponObject;
    };

    const createGearRecordFunctionMap = {
        weapon: createWeaponRecord
    };

    let getOrAddFile = function(filename) {
        let fileId = xelib.FileByName(filename);
        if (!fileId) {
            fileId = xelib.AddFile(filename);
        }
        return fileId;
    };

    let finishWorkflow = function(model) {
        console.log(model);

        let createGearRecord = createGearRecordFunctionMap[model.gearCategory];

        if (!createGearRecord) {
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
                    const recordObject = createGearRecord(item, pluginId);
                    writeObjectToElementService.writeObjectToRecord(pluginId, recordObject);
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
            name: 'Set Weapon Attributes',
            view: 'setItemAttributes'
        }, {
            name: 'Select Plugin',
            view: 'pluginSelector'
        }]
    });
});