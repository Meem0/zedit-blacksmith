module.exports = ({ngapp, xelib, modulePath}) =>
ngapp.run(function(workflowService) {
    workflowService.addModule({
        name: 'Blacksmith',
        label: 'Blacksmith',
        image: `${modulePath}/resources/images/Blacksmith.png`,
        games: [xelib.gmTES5, xelib.gmSSE],
        workflows: [
            'makeWeapons', 'makeArmor', 'makeRecipes', 'makeTemperRecipes', 'addToLeveledLists', 'distributeUniques'
        ],
        getTheme: function(theme) {
            return `${modulePath}\\css\\${theme}`;
        }
    });
});
