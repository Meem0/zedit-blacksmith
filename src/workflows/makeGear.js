ngapp.service('createGearRecordService', function(skyrimAttributeService) {
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

    let createWeaponRecord = function(weapon) {
        let weaponObject = {
            "Record Header": {
                "Signature": "WEAP"
            },
            "EDID": weapon.editorId,
            "FULL": weapon.name
        };
        Object.entries(weapon.attributes).forEach(([attributeName, {value}]) => {
            const keyPath = skyrimAttributeService.getAttributeKeyPath('weapon', attributeName);
            setDeep(weaponObject, value, keyPath);
        });
        return weaponObject;
    };

    const createGearRecordFunctionMap = {
        weapon: createWeaponRecord
    };

    this.createGearRecord = function(gearCategory, item) {
        if (createGearRecordFunctionMap[gearCategory]) {
            return createGearRecordFunctionMap[gearCategory](item);
        }
    };
});

ngapp.run(function(workflowService, writeObjectToElementService, createGearRecordService) {
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
                if (!pluginId) {
                    return;
                }

                xelib.AddAllMasters(pluginId);
                model.items.forEach(item => {
                    const recordObject = createGearRecordService.createGearRecord(model.gearCategory, item);
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