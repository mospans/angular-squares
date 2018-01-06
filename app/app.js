'use strict';

// Declare app level module which depends on views, and components
var app = angular.module('myApp', [
    'ngRoute',
    'ngAnimate',
    'game'
]);

app.config(['$locationProvider', '$routeProvider', function($locationProvider, $routeProvider) {
    $routeProvider
        .when('/', {
            templateUrl : 'components/squares/views/game.html',
            controller : 'game'
        })
    ;

    $locationProvider.html5Mode(true);
}]);