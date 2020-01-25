ngapp.run(function(workflowService) {
    workflowService.addModule({
        name: 'Blacksmith',
        label: 'Blacksmith',
        image: `${modulePath}/resources/images/Sword.png`,
        games: [xelib.gmTES5, xelib.gmSSE],
        workflows: [
            'Make a Weapon'
        ]
    });
});
