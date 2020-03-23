let getShortKey = function (fullKey) {
    const matchResult = fullKey.match(/^([A-Z1-9][A-Z1-9][A-Z1-9][A-Z1-9]) - /);
    return (matchResult && matchResult[1]) || fullKey;
};

const excludedKeys = ['Record Header', 'EDID', 'OBND', 'FULL', 'Model', 'KSIZ'];

let transformRecordObject = function(recordObject, transformedObject = {}, parentKey = '') {
    Object.entries(recordObject).forEach(([key, value]) => {
        const shortKey = getShortKey(key);
        if (!excludedKeys.includes(shortKey)) {
            let keyPath = shortKey;
            if (parentKey) {
                keyPath = `${parentKey}\\${shortKey}`;
            }
            if (typeof(value) === 'number') {
                transformedObject[keyPath] = Math.round(value * 1000) / 1000;
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

let blacksmithHelpers = require('../lib/blacksmithHelpers');
let testCases = fh.jetpack.read('test/testCases.json', 'json');
testCases.forEach(({itemType, material, gearCategory, reference}) => {
    if (gearCategory !== 'weapon' || !reference || reference === 'ERROR') {
        return;
    }

    const gameRecordObject = xelib.WithHandle(
        blacksmithHelpers.getRecordFromReference(reference),
        id => blacksmithHelpers.elementToObject(id)
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
                expect(workflowObject[key]).toEqual(gameTestObject[key]);
            });
        });
    });
});
