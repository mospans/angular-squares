'use strict';

// Declare app level module which depends on views, and components
var app = angular.module('myApp', [
    'ngRoute'
]);

app.controller('game', function ($scope) {
    $scope.colors = ['#000', '#44f', '#f44', '#4f4', '#b0b', '#ff4'];
    $scope.colorsCount = $scope.colors.length - 1;

    $scope.cells = [];
    $scope.width = 3;
    $scope.height = 3;
    $scope.cellSide = 50; // pixels

    $scope.random = function (from, to) {
        return Math.floor(Math.random() * (to - from + 1)) + from;
    };

    $scope.generateRandomColor = function (excluded_values) {
        if (excluded_values === null || excluded_values === undefined) {
            excluded_values = [];
        }
        var result;
        do {
            result = $scope.random(1, $scope.colorsCount);
        } while (excluded_values.indexOf(result) !== -1);

        return result;
    };

    /**
     * @param x
     * @param y
     * @returns FieldCell
     */
    $scope.getCell = function (x, y) {
        var cell_index = y * $scope.width + x;
        if ($scope.cells.length < cell_index) {
            throw new Error('Not found cell with coordinates ' + x.toString() + ', ' + y.toString());
        }
        return $scope.cells[cell_index];
    };

    $scope.fill = function () {
        var excluded_color_indexes = [];
        $scope.cells = [];
        for (var y = 0; y < $scope.height; y++) {
            for (var x = 0; x < $scope.width; x++) {
                excluded_color_indexes = [];
                if (x === 0 && y === 0) {
                    excluded_color_indexes = [];
                } else if (x === 0) {
                    excluded_color_indexes.push(
                        $scope.getCell(x, y - 1).color
                    );
                } else if (y === 0) {
                    excluded_color_indexes.push(
                        $scope.getCell(x - 1, y).color
                    );
                } else {
                    excluded_color_indexes.push(
                        $scope.getCell(x, y - 1).color
                    );
                    excluded_color_indexes.push(
                        $scope.getCell(x - 1, y).color
                    );
                }

                $scope.cells.push(new FieldCell(
                    x,
                    y,
                    $scope.generateRandomColor(excluded_color_indexes)
                ));
            }
        }
    };

    $scope.fill();
});

app.config(['$locationProvider', '$routeProvider', function($locationProvider, $routeProvider) {
    $routeProvider
        .when('/', {
            templateUrl : 'views/game.html',
            controller : 'game'
        })
    ;

    $locationProvider.html5Mode(true);
}]);