ngapp.run(function(workflowService) {
    workflowService.addWorkflow({
        name: 'makeWeapons',
        label: 'Make Weapons',
        image: `${modulePath}/resources/images/Sword.png`,
        games: [xelib.gmTES5, xelib.gmSSE],
        finish: () => true,
        stages: [{
            name: 'Select Weapons',
            view: 'selectGear',
            input: {
                gearCategory: 'weapon'
            }
        }]
    });
});