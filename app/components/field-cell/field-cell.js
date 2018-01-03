'use strict';

app.directive('fieldCell', function () {
    return {
        restrict: 'A',
        scope: {
            cell: '=',
            cellSide: '='
        },
        template: '{{ cell.color }}',
        link: function (scope, element, attrs) {
            var cell = scope.cell;
            element
                .addClass('x' + cell.x)
                .addClass('y' + cell.y)
                .css({
                    position: 'absolute',
                    left: (cell.x * scope.cellSide) + 'px',
                    top: (cell.y * scope.cellSide) + 'px'
                })
            ;
        }
    };
});
