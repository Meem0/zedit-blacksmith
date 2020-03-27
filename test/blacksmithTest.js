let getShortKey = function (fullKey) {
    const matchResult = fullKey.match(/^([A-Z1-9][A-Z1-9][A-Z1-9][A-Z1-9]) - /);
    return (matchResult && matchResult[1]) || fullKey;
};

const excludedKeys = ['Record Header', 'EDID', 'OBND', 'FULL', 'Model', 'KSIZ', 'WNAM', 'Unused', 'Unknown'];

let transformRecordObject = function(recordObject, transformedObject = {}, parentKey = '') {
    Object.entries(recordObject).forEach(([key, value]) => {
        const shortKey = getShortKey(key);
        if (!excludedKeys.includes(shortKey)) {
            let keyPath = shortKey;
            if (parentKey) {
                keyPath = `${parentKey}\\${shortKey}`;
            }
            if (typeof(value) === 'number') {
                transformedObject[keyPath] = Math.round(value * 100000) / 100000;
            }
            else if (Array.isArray(value) || typeof(value) !== 'object') {
                transformedObject[keyPath] = value;
            }
            else {
                transformRecordObject(value, transformedObject, keyPath);
            }
        }
    });
    return transformedObject;
};

const overrideTestValues = [{
    keyPath: 'BIDS',
    itemType: 'Greatsword',
    material: 'Elven',
    value: 'Skyrim.esm:0183FF'
}];

let getOverrideTestValue = function(inKeyPath, inItemType, inMaterial) {
    const overrideTestValue = overrideTestValues.find(({keyPath, itemType, material}) => keyPath === inKeyPath && itemType == inItemType && material === inMaterial);
    if (overrideTestValue) {
        return overrideTestValue.value;
    }
};

beforeAll(function() {
    console.log('beforeAll - include files');

    require('./workflowSystem/workflowService');
    require('./workflowSystem/views/pluginSelector');
    const paths = fh.jetpack.find('src', {matching: ['*.js']});
    paths.forEach(path => require(`..\\${path}`));
});

afterAll(function() {
    console.log('afterAll - teardown xelib');
    xelib.Finalize();
});

let blacksmithHelpers = require('../lib/blacksmithHelpers')(zeditGlobals);
let testCases = fh.jetpack.read('test/testCases.json', 'json');
testCases.forEach(({itemType, material, gearCategory, reference}) => {
    if (gearCategory !== 'weapon' || !reference || reference === 'ERROR') {
        return;
    }

    const gameRecordObject = xelib.WithHandle(
        blacksmithHelpers.getRecordFromReference(reference),
        id => xelib.WithHandle(
            xelib.GetWinningOverride(id),
            overrideId => blacksmithHelpers.elementToObject(overrideId)
        )
    );
    let gameTestObject = transformRecordObject(gameRecordObject);

    describe(`${material} ${itemType}`, function() {
        let createGearRecordService;
        let stageRoadmap;
        let workflowObject;

        angular.mock.module.sharedInjector();

        beforeAll(function() {
            angular.mock.module('blacksmithTest');
            angular.mock.module('blacksmithTest', function($provide) {
                let mockSettingsService = {
                    registerSettings: () => {},
                    settings: {blacksmith: {debugMode: true}}
                };
            
                $provide.value('settingsService', mockSettingsService);
            });

            let workflowModel;
            inject(function(_createGearRecordService_, workflowService) {
                createGearRecordService = _createGearRecordService_;
                
                ({stageRoadmap, workflowModel} = workflowService.processWorkflow('makeWeapons', {
                    gearCategory
                }, {
                    'Select Weapons': {items: [{
                        name: 'Mock Weapon',
                        editorId: 'MockWeapon',
                        nif: 'MockModel.nif',
                        type: itemType,
                        material: material
                    }]},
                    'Set Weapon Attributes': {},
                    'Select Plugin': {
                        plugin: 'MockPlugin.esp'
                    }
                }));
            });

            const workflowRecordObject = createGearRecordService.createGearRecord(workflowModel.gearCategory, workflowModel.items[0]);
            workflowObject = transformRecordObject(workflowRecordObject);
        });

        test('Workflow completed successfully', function() {
            expect(stageRoadmap.every(stage => stage.isComplete())).toBeTruthy();
        });

        Object.keys(gameTestObject).forEach(key => {
            test(key, function() {
                const workflowValue = workflowObject[key];
                const gameValue = getOverrideTestValue(key, itemType, material) || gameTestObject[key];
                if (Array.isArray(workflowValue) && Array.isArray(gameValue)) {
                    expect(workflowValue.length).toEqual(gameValue.length);
                    gameValue.forEach(gameValueItem => expect(workflowValue).toContain(gameValueItem));
                }
                else {
                    expect(workflowValue).toEqual(gameValue);
                }
            });
        });
    });
});
