ngapp.run(function(workflowService) {
    let distributeUniqueItemController = function($scope) {
        debugger;
        $scope.container = {
            get longName() {
                let containerLongName;
                if ($scope.model.uniqueLootContainerInsertions) {
                    containerLongName = blacksmithHelpers.runOnReferenceRecord($scope.model.uniqueLootContainerInsertions[$scope.item.key], xelib.LongName);
                }
                return containerLongName || '';
            },
            set longName(value) {
                const containerReference = blacksmithHelpers.getReferenceFromLongName(value);
                if (blacksmithHelpers.runOnReferenceRecord(containerReference, xelib.Signature) !== 'REFR') {
                    return;
                }
                if (!$scope.model.uniqueLootContainerInsertions) {
                    $scope.model.uniqueLootContainerInsertions = {};
                }
                $scope.model.uniqueLootContainerInsertions[$scope.item.key] = containerReference;
            },
            formIdEdit: '',
            get formId() {
                return this.formIdEdit;
            },
            set formId(value) {
                this.formIdEdit = value;
                const containerReference = blacksmithHelpers.getReferenceFromFormId(value);
                if (!containerReference || blacksmithHelpers.runOnReferenceRecord(containerReference, xelib.Signature) !== 'REFR') {
                    return;
                }
                if (!$scope.model.uniqueLootContainerInsertions) {
                    $scope.model.uniqueLootContainerInsertions = {};
                }
                $scope.model.uniqueLootContainerInsertions[$scope.item.key] = containerReference;
            }
        };
    };

    let distributeUniquesOptionsController = function($scope) {
        $scope.containerSignatures = ['REFR'];
        $scope.distributeUniqueItemController = distributeUniqueItemController;
    };

    workflowService.addView('distributeUniquesOptions', {
        templateUrl: `${moduleUrl}/partials/views/distributeUniquesOptions.html`,
        controller: distributeUniquesOptionsController,
        requireInput: ['items'],
        process: function(input, model) {
            let uniqueLootContainerInsertions = model.uniqueLootContainerInsertions;
            return { uniqueLootContainerInsertions };
        }
    });
});
