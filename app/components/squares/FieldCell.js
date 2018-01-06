'use strict';

var FieldCell = function (x, y, color, clicked) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.clicked = clicked || false;
    this.animation = {
        enabled: false,
        tick: 0,
        properties: {}
    };
};

FieldCell.prototype.onClick = function (new_color) {
    if (this.clicked === true) {
        return false;
    }
    this.clicked = true;
    this.color = new_color;
};