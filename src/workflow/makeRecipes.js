ngapp.run(function(workflowService) {
    let finishWorkflow = function(model) {
    };

    workflowService.addWorkflow({
        name: 'makeRecipes',
        label: 'Make Crafting Recipes',
        image: `${modulePath}/resources/images/Recipe.png`,
        games: [xelib.gmTES5, xelib.gmSSE],
        finish: finishWorkflow,
        stages: [{
            name: 'Edit Recipes',
            view: 'editRecipes'
        }]
    });
});