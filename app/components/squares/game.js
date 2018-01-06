'use strict';

if (window.requestAnimationFrame === undefined) {
    window.requestAnimationFrame = function (callback) {
        return window.webkitRequestAnimationFrame(callback)
            || window.mozRequestAnimationFrame(callback) || window.oRequestAnimationFrame(callback)
            || window.msRequestAnimationFrame(callback)
            || (
                function (callback) {
                    setInterval(callback, 1000 / 60);
                }
            )(callback);
    };
}

var game = angular.module('game', []);

game.controller('game', ['$scope', '$q', function ($scope, $q) {
    $scope.colors = ['#000', '#44f', '#f44', '#4f4', '#b0b', '#ff4'];
    $scope.colorsCount = $scope.colors.length - 1;

    $scope.cells = [];
    $scope.width = 3;
    $scope.height = 3;
    $scope.cellSide = 50; // pixels

    $scope.game = {
        variants: [
            {width: 1, height: 1},
            {width: 3, height: 3},
            {width: 5, height: 5},
            {width: 10, height: 10}
        ],
        points: 0,
        statuses: {
            STOPPED: 1,
            STARTED: 2,
            GAME_OVER: 10,

            GAME_OVER_ANIMATION: 100
        },
        status: 1
    };

    $scope.random = function (from, to) {
        return Math.floor(Math.random() * (to - from + 1)) + from;
    };

    $scope.generateRandomColor = function (excludedValues) {
        if (excludedValues === null || excludedValues === undefined) {
            excludedValues = [];
        }
        var result;
        do {
            result = $scope.random(1, $scope.colorsCount);
        } while (excludedValues.indexOf(result) !== -1);

        return result;
    };

    $scope.getNextAnimationValues = function (animation) {
        var result = {};
        animation.tick++;
        angular.forEach(animation.properties, function (range, property) {
            result[property] = range.start + animation.tick * (range.end - range.start) / 10;
            switch (property) {
                case 'left':
                case 'top':
                    result[property] += 'px';
                    break;
            }
        });

        return result;
    };

    var animateStep = function (element, deferred) {
        var fieldCell = element.scope().cell,
            changedStyle = {};
        $scope.$apply(function () {
            if (
                fieldCell.animation.enabled === true
                && angular.equals(fieldCell.animation.properties, {}) === false
            ) {
                changedStyle = $scope.getNextAnimationValues(fieldCell.animation);
                element.css(changedStyle);
            }
            if (
                fieldCell.animation.enabled === false
                || (
                    element.css('left') === fieldCell.animation.properties.left.end + 'px'
                    && element.css('top') === fieldCell.animation.properties.top.end + 'px'
                )
            ) {
                $scope.stopAnimate(element);
                deferred.resolve();
            } else {
                window.requestAnimationFrame(function () {
                    animateStep(element, deferred);
                });
            }
        });
    };

    $scope.animate = function (element) {
        var deferred = $q.defer();
        animateStep(element, deferred);
        return deferred.promise;
    };

    $scope.stopAnimate = function (element) {
        var fieldCell = element.scope().cell;
        fieldCell.animation.properties = {};
        fieldCell.animation.tick = 0;
        fieldCell.animation.enabled = false;
        if ($scope.isAnimate() && $scope.isAnimationEnd()) {
            $scope.changeStatusAfterAnimation();
        }
    };

    $scope.isAnimate = function () {
        return (
            [
                $scope.game.statuses.GAME_OVER_ANIMATION
            ].indexOf($scope.game.status) !== -1
        );
    };

    $scope.isAnimationEnd = function () {
        return $scope.fieldCellsCoordinatesForEach(
            function (x, y) {
                var fieldCell = $scope.getFieldCell(x, y);
                if (fieldCell.animation.enabled === true) {
                    return false;
                }
            },
            true
        );
    };

    $scope.changeStatusAfterAnimation = function () {
        switch ($scope.game.status) {
            case $scope.game.statuses.GAME_OVER_ANIMATION:
                $scope.game.status = $scope.game.statuses.GAME_OVER;
                break;
        }
    };

    $scope.getFieldCellIndex = function (x, y) {
        return y * $scope.width + x;
    };

    /**
     * @param {number} x
     * @param {number} y
     * @returns FieldCell
     */
    $scope.getFieldCell = function (x, y) {
        var cellIndex = $scope.getFieldCellIndex(x, y);
        if ($scope.cells.length < cellIndex) {
            throw new Error('Not found cell with coordinates ' + x.toString() + ', ' + y.toString());
        }
        return $scope.cells[cellIndex];
    };

    /**
     * @returns {{width: string, height: string, backgroundColor: string}}
     */
    $scope.getFieldCellStyle = function () {
        var style = {
            width: $scope.cellSide + 'px',
            height: $scope.cellSide + 'px',
            backgroundColor: $scope.colors[this.cell.color]
        };

        if ($scope.isAnimate() === false) {
            style.left = (this.cell.x * $scope.cellSide) + 'px';
            style.top = (this.cell.y * $scope.cellSide) + 'px';
        }

        return style;
    };

    $scope.fieldCellOnClick = function () {
        if ($scope.isAnimate() === true) {
            return true;
        }
        this.cell.onClick($scope.generateRandomColor([this.cell.color]));
        $scope.checkGameOver();
    };

    $scope.fieldCellsCoordinatesForEach = function (callback, atEndReturnValue) {
        if (!angular.isFunction(callback)) {
            throw new Error('Argument is not a function');
        }

        var result;

        for (var y = 0; y < $scope.height; y++) {
            for (var x = 0; x < $scope.width; x++) {
                result = callback(x, y);
                if (result !== undefined) {
                    return result;
                }
            }
        }

        if (atEndReturnValue !== undefined) {
            return atEndReturnValue;
        }
    };

    $scope.fill = function () {
        $scope.cells = [];

        $scope.fieldCellsCoordinatesForEach(function (x, y) {
            var excludedColorIndexes = [];
            if (x === 0 && y === 0) {
                excludedColorIndexes = [];
            } else if (x === 0) {
                excludedColorIndexes.push(
                    $scope.getFieldCell(x, y - 1).color
                );
            } else if (y === 0) {
                excludedColorIndexes.push(
                    $scope.getFieldCell(x - 1, y).color
                );
            } else {
                excludedColorIndexes.push(
                    $scope.getFieldCell(x, y - 1).color
                );
                excludedColorIndexes.push(
                    $scope.getFieldCell(x - 1, y).color
                );
            }

            $scope.cells.push(new FieldCell(
                x,
                y,
                $scope.generateRandomColor(excludedColorIndexes)
            ));
        });
    };

    $scope.startGame = function (width, height) {
        $scope.width = width;
        $scope.height = height;
        $scope.points = 0;

        $scope.fill();
        $scope.game.status = $scope.game.statuses.STARTED;
    };

    $scope.checkGameOver = function () {
        var isGameOver = $scope.fieldCellsCoordinatesForEach(
            function (x, y) {
                if ($scope.getFieldCell(x, y).clicked === false) {
                    return false;
                }
            },
            true
        );

        if (isGameOver === true) {
            $scope.game.status = $scope.game.statuses.GAME_OVER_ANIMATION;
        }
    };

    $scope.$watch(
        'game.status',
        /**
         * @param {number} newValue
         * @param {number} oldValue
         */
        function (newValue, oldValue) {
            if (newValue === $scope.game.statuses.GAME_OVER) {
                // $scope.game.status = $scope.game.statuses.GAME_OVER_ANIMATION;
            } else if (
                newValue === $scope.game.statuses.GAME_OVER_ANIMATION
            ) {
                $scope.fieldCellsCoordinatesForEach(function (x, y) {
                    var fieldCell = $scope.getFieldCell(x, y);
                    fieldCell.animation.properties.left = {start: (x * $scope.cellSide)};
                    fieldCell.animation.properties.top = {start: (y * $scope.cellSide)};

                    // 50% - 50%
                    if ($scope.random(1, 2) === 1) {
                        fieldCell.animation.properties.top.end = $scope
                            .random(-$scope.cellSide - 200, -$scope.cellSide);
                    } else {
                        fieldCell.animation.properties.top.end = $scope
                            .random($scope.cellSide * $scope.width, $scope.cellSide * $scope.width + 200);
                    }
                    // 50% - 50%
                    if ($scope.random(1, 2) === 1) {
                        fieldCell.animation.properties.left.end = $scope
                            .random(-$scope.cellSide - 200, -$scope.cellSide);
                    } else {
                        fieldCell.animation.properties.left.end = $scope
                            .random($scope.cellSide * $scope.height, $scope.cellSide * $scope.height + 200);
                    }

                    fieldCell.animation.enabled = true;
                });
            }
        }
    );

    $scope.game.status = $scope.game.statuses.STOPPED;
    $scope.startGame(1, 1); // TODO: remove at production
}]);

game.animation('.animated', function animationFactory() {
    return {
        addClass: function (element, className, done) {
            var $scope = element.scope();
            if (className.indexOf('animated') === -1) {
                return;
            }
            $scope.animate(element).then(done);
            return function (wasCanceled) {
                if (wasCanceled === true) {
                    $scope.stopAnimate(element);
                }
            };
        },
        removeClass: function (element, className, done) {
            if (className.indexOf('animated') === -1) {
                return;
            }
            done();
        }
    };
});
