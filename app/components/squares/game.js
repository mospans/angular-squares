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
    $scope.width = 3;
    $scope.height = 3;
    $scope.cells = [];

    $scope.cellSide = 50; // in pixels
    var colors = ['#000', '#44f', '#f44', '#4f4', '#b0b', '#ff4'],
        colorsCount = colors.length - 1,
        minCountFieldCellsInRow = 3,
        disappearingFieldCellsIndexes = [];

    $scope.game = {
        variants: [
            {width: 3, height: 3},
            {width: 5, height: 5},
            {width: 10, height: 10}
        ],
        points: 0,
        statuses: {
            STOPPED: 1,
            RAN: 2,
            ANIMATION_CELLS_DISAPPEARING: 3,
            ANIMATION_SHIFT: 4,

            ANIMATION_GAME_OVER: 9,
            GAME_OVER: 10
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
            result = $scope.random(1, colorsCount);
        } while (excludedValues.indexOf(result) !== -1);

        return result;
    };

    $scope.getNextAnimationValues = function (animation) {
        var result = {};
        animation.tick++;
        angular.forEach(animation.properties, function (range, property) {
            result[property] = range.start + animation.tick * (range.end - range.start) / 24;
            if (
                (result[property] > range.end && range.start < range.end)
                || (result[property] < range.end && range.start > range.end)
            ) {
                delete(result[property]);
                return;
            }
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
        if (
            fieldCell.animation.enabled === true
            && angular.equals(fieldCell.animation.properties, {}) === false
        ) {
            changedStyle = $scope.getNextAnimationValues(fieldCell.animation);
            element.css(changedStyle);
        }
        if (
            fieldCell.animation.enabled === false
            || angular.equals(changedStyle, {}) === true
        ) {
            $scope.stopAnimate(element);
            deferred.resolve();
        } else {
            window.requestAnimationFrame(function () {
                animateStep(element, deferred);
            });
        }
    };

    $scope.animate = function (element) {
        var deferred = $q.defer();
        animateStep(element, deferred);
        return deferred.promise;
    };

    var isAnimate = function () {
        var isAnimate = false;
        angular.forEach($scope.game.statuses, function (value, property) {
            if ($scope.game.status === value && property.substr(0, 10) === 'ANIMATION_') {
                isAnimate = true;
            }
        });

        return isAnimate;
    };

    var isAnimationEnd = function () {
        var isAnimationEnd = true,
            fieldCell;
        for (var cellIndex in $scope.cells) {
            fieldCell = $scope.cells[cellIndex];
            if (fieldCell.animation.enabled === true) {
                isAnimationEnd = false;
                break;
            }
        }

        return isAnimationEnd;
    };

    var changeStatusAfterAnimation = function () {
        switch ($scope.game.status) {
            case $scope.game.statuses.ANIMATION_GAME_OVER:
                $scope.game.status = $scope.game.statuses.GAME_OVER;
                break;

            case $scope.game.statuses.ANIMATION_CELLS_DISAPPEARING:
                $scope.game.status = $scope.game.statuses.ANIMATION_SHIFT;
                break;

            case $scope.game.statuses.ANIMATION_SHIFT:
                $scope.game.status = $scope.game.statuses.RAN;
                break;
        }
    };

    $scope.stopAnimate = function (element) {
        $scope.$apply(function () {
            var fieldCell = element.scope().cell;
            fieldCell.animation.properties = {};
            fieldCell.animation.tick = 0;
            fieldCell.animation.enabled = false;
        });

        if (isAnimate() === false) {
            return;
        }
        if (isAnimationEnd() === false) {
            return;
        }
        changeStatusAfterAnimation();
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
            backgroundColor: colors[this.cell.color],
            left: (this.cell.x * $scope.cellSide) + 'px',
            top: (this.cell.y * $scope.cellSide) + 'px',
            opacity: 1
        };

        if (this.cell.animation.enabled === true) {
            angular.forEach(this.cell.animation.properties, function (value, property) {
                if (property in style) {
                    delete(style[property]);
                }
            });
        }

        return style;
    };

    $scope.fieldCellOnClick = function () {
        if (isAnimate() === true) {
            return;
        }
        this.cell.onClick($scope.generateRandomColor([this.cell.color]));
        if (disappearByFieldCell(this.cell) === true) {
            $scope.game.status = $scope.game.statuses.ANIMATION_CELLS_DISAPPEARING;
        } else {
            $scope.checkGameOver();
        }
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
        $scope.game.points = 0;
        disappearingFieldCellsIndexes = [];

        $scope.fill();
        $scope.game.status = $scope.game.statuses.RAN;
    };

    var isFieldCellProcessed = function (x, y) {
        return (disappearingFieldCellsIndexes.indexOf($scope.getFieldCellIndex(x, y)) !== -1);
    };

    var disappearByFieldCell = function (fieldCell) {
        var
            x = fieldCell.x,
            y = fieldCell.y,
            //iteration of matches colors:
            iteration = 1,
            // point of match color:
            matches = {
                top: {x: x, y: y},
                right: {x: x, y: y},
                bottom: {x: x, y: y},
                left: {x: x, y: y}
            },
            // in which directions search goes on:
            activeDirections = {
                top: true,
                right: true,
                bottom: true,
                left: true
            },
            //count of horizontal matches colors:
            horizontalMatchesCount = 1,
            //count of vertical matches colors
            verticalMatchesCount = 1;

        while (iteration < 10) {
            //check top border
            if (matches.top.y === 0) {
                activeDirections.top = false;
            }
            //check right border
            if (matches.right.x === $scope.width - 1) {
                activeDirections.right = false;
            }
            //check bottom border
            if (matches.bottom.y === $scope.height - 1) {
                activeDirections.bottom = false;
            }
            //check left border
            if (matches.left.x === 0) {
                activeDirections.left = false;
            }
            if (activeDirections.top === true) {
                if (
                    $scope.getFieldCell(x, matches.top.y - 1).color === fieldCell.color
                    && isFieldCellProcessed(x, y) === false
                ) {
                    matches.top.y = matches.top.y - 1;
                    verticalMatchesCount++;
                } else {
                    activeDirections.top = false;
                }
            }
            if (activeDirections.right === true) {
                if (
                    $scope.getFieldCell(matches.right.x + 1, y).color === fieldCell.color
                    && isFieldCellProcessed(x, y) === false
                ) {
                    matches.right.x = matches.right.x + 1;
                    horizontalMatchesCount++;
                } else {
                    activeDirections.right = false;
                }
            }
            if (activeDirections.bottom === true) {
                if (
                    $scope.getFieldCell(x, matches.bottom.y + 1).color === fieldCell.color
                    && isFieldCellProcessed(x, y) === false
                ) {
                    matches.bottom.y = matches.bottom.y + 1;
                    verticalMatchesCount++;
                } else {
                    activeDirections.bottom = false;
                }
            }
            if (activeDirections.left === true) {
                if (
                    $scope.getFieldCell(matches.left.x - 1, y).color === fieldCell.color
                    && isFieldCellProcessed(x, y) === false
                ) {
                    matches.left.x = matches.left.x - 1;
                    horizontalMatchesCount++;
                } else {
                    activeDirections.left = false;
                }
            }

            if (angular.equals(activeDirections, {top: false, right: false, bottom: false, left: false})) {
                break;
            }
            iteration++;
        }
        if (verticalMatchesCount < minCountFieldCellsInRow && horizontalMatchesCount < minCountFieldCellsInRow) {
            return false;
        }
        if (verticalMatchesCount >= minCountFieldCellsInRow) {
            for (var checkingY = matches.top.y; checkingY <= matches.bottom.y; checkingY++) {
                if (isFieldCellProcessed(x, checkingY) === true) {
                    continue;
                }
                if ($scope.getFieldCell(x, checkingY).clicked === true) {
                    $scope.game.points++;
                    $scope.getFieldCell(x, checkingY).clicked = false;
                }
                $scope.game.points++;
                disappearingFieldCellsIndexes.push($scope.getFieldCellIndex(x, checkingY));

            }
        }
        if (horizontalMatchesCount >= minCountFieldCellsInRow) {
            for (var checkingX = matches.left.x; checkingX <= matches.right.x; checkingX++) {
                if (isFieldCellProcessed(checkingX, y) === true) {
                    continue;
                }
                if ($scope.getFieldCell(checkingX, y).clicked === true) {
                    $scope.game.points++;
                    $scope.getFieldCell(checkingX, y).clicked = false;
                }
                $scope.game.points++;
                disappearingFieldCellsIndexes.push($scope.getFieldCellIndex(checkingX, y));
            }
        }
        return true;
    };

    var rearrangeFieldCellsBeforeShift = function () {
        var changedPartOfColumn,
            fieldCell,
            countNewFieldCells = 0,
            startDelta,
            fromNewToOldYValue;
        for (var x = 0; x < $scope.width; x++) {
            changedPartOfColumn = [];
            fromNewToOldYValue = {};
            for (var y = 0; y < $scope.height; y++) {
                if (isFieldCellProcessed(x, y) === true) {
                    changedPartOfColumn.push(new FieldCell(
                        x,
                        changedPartOfColumn.length,
                        $scope.generateRandomColor(),
                        false
                    ));
                }
            }
            countNewFieldCells = changedPartOfColumn.length;
            for (y = 0; y < $scope.height; y++) {
                if (isFieldCellProcessed(x, y) === false) {
                    if (changedPartOfColumn.length === y) {
                        break;
                    }
                    fieldCell = $scope.getFieldCell(x, y);
                    fromNewToOldYValue[changedPartOfColumn.length] = y;
                    changedPartOfColumn.push(new FieldCell(
                        x,
                        changedPartOfColumn.length,
                        fieldCell.color,
                        fieldCell.clicked
                    ));
                }
            }
            for (var newY in changedPartOfColumn) {
                if (newY <= countNewFieldCells) {
                    startDelta = +newY - countNewFieldCells;
                } else {
                    startDelta = fromNewToOldYValue[newY];
                }
                fieldCell = $scope.getFieldCell(x, +newY);
                fieldCell.color = changedPartOfColumn[newY].color;
                fieldCell.clicked = changedPartOfColumn[newY].clicked;
                fieldCell.animation.properties.top = {};
                fieldCell.animation.properties.top.start = startDelta * $scope.cellSide;
                fieldCell.animation.properties.top.end = changedPartOfColumn[newY].y * $scope.cellSide;
                fieldCell.animation.enabled = true;
            }
        }
        disappearingFieldCellsIndexes = [];
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
            $scope.game.status = $scope.game.statuses.ANIMATION_GAME_OVER;
        }
    };

    $scope.$watch(
        'game.status',
        /**
         * @param {number} newValue
         * @param {number} oldValue
         */
        function (newValue, oldValue) {
            switch (newValue) {
                case $scope.game.statuses.ANIMATION_CELLS_DISAPPEARING:
                    $scope.fieldCellsCoordinatesForEach(function (x, y) {
                        if (isFieldCellProcessed(x, y) === false) {
                            return undefined;
                        }
                        var fieldCell = $scope.getFieldCell(x, y);
                        fieldCell.animation.properties.opacity = {
                            start: 1,
                            end: 0
                        };
                        fieldCell.animation.enabled = true;
                    });
                    break;

                case $scope.game.statuses.ANIMATION_SHIFT:
                    rearrangeFieldCellsBeforeShift();
                    break;

                case $scope.game.statuses.ANIMATION_GAME_OVER:
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
                    break;
            }
        }
    );

    $scope.game.status = $scope.game.statuses.STOPPED;
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
