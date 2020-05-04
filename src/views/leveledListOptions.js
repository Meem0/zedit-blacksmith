module.exports = ({ngapp, xelib, moduleUrl}, blacksmithHelpers) =>
ngapp.run(function(workflowService) {
    let getDefaultTemplateItem = function(item) {
        return 'Skyrim.esm:012EB7';
    };

    let leveledListOptionsController = function($scope) {
        $scope.leveledListTemplateItemSignatures = ['ARMO', 'WEAP'];
        $scope.leveledListTemplateItems = $scope.input.items.map(item => {
            let initialTemplateItem;
            if ($scope.model.leveledListTemplateItems) {
                initialTemplateItem = $scope.model.leveledListTemplateItems[item.key];
            }
            if (initialTemplateItem === undefined) {
                initialTemplateItem = getDefaultTemplateItem(item);
            }
            return {
                itemName: item.name,
                cachedTemplateItem: initialTemplateItem,
                templateItemSignature: blacksmithHelpers.runOnReferenceRecord(initialTemplateItem, xelib.Signature),
                get templateItemLongName() {
                    return blacksmithHelpers.runOnReferenceRecord(this.cachedTemplateItem, xelib.LongName);
                },
                set templateItemLongName(value) {
                    if (!$scope.model.leveledListTemplateItems) {
                        $scope.model.leveledListTemplateItems = {};
                    }
                    this.cachedTemplateItem = blacksmithHelpers.getReferenceFromLongName(value);
                    $scope.model.leveledListTemplateItems[item.key] = this.cachedTemplateItem;
                }
            };
        });
    };

    workflowService.addView('leveledListOptions', {
        templateUrl: `${moduleUrl}/partials/views/leveledListOptions.html`,
        controller: leveledListOptionsController,
        requireInput: ['items'],
        process: function({items}, model) {
            let templateItems = items.reduce((templateItems, item) => {
                let templateItem;
                if (model.leveledListTemplateItems) {
                    templateItem = model.leveledListTemplateItems[item.key];
                }
                if (!templateItem) {
                    templateItem = getDefaultTemplateItem(item);
                }
                templateItems[item.key] = templateItem;
                return templateItems;
            }, {});
            return { leveledListTemplateItems: templateItems };
        }
    });
});
