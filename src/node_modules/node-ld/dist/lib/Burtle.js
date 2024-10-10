"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Burtle = function () {
    function Burtle() {
        _classCallCheck(this, Burtle);

        this.x = { a: 0, b: 0, c: 0, d: 0 };
    }

    _createClass(Burtle, [{
        key: "init",
        value: function init(seed) {
            var i;
            var x = this.x;
            x.a = 0xf1ea5eed;
            x.b = x.c = x.d = seed;
            for (i = 0; i < 42; ++i) {
                this.rand(x);
            }
        }
    }, {
        key: "rand",
        value: function rand() {
            var x = this.x;
            var rot = function rot(a, b) {
                return (a << b | a >>> 32 - b) >>> 0;
            };
            var e = x.a - rot(x.b, 21) >>> 0;
            x.a = (x.b ^ rot(x.c, 19)) >>> 0;
            x.b = x.c + rot(x.d, 6) >>> 0;
            x.c = x.d + e >>> 0;
            x.d = e + x.a >>> 0;
            return x.d;
        }
    }]);

    return Burtle;
}();

exports.default = Burtle;