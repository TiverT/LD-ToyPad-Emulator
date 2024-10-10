"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Frame = function () {
	function Frame(buf) {
		_classCallCheck(this, Frame);

		if (buf) this.parse(buf);
	}

	_createClass(Frame, [{
		key: "parse",
		value: function parse(b) {
			this.type = b[0];
			this.len = b[1];
			this.payload = b.slice(2, 2 + this.len);
			this.chksum = b[this.len + 2];
		}
	}, {
		key: "build",
		value: function build() {
			var buf = new Buffer(32);
			buf.fill(0);
			buf[0] = this.type;
			buf[1] = this.payload.length;
			this.payload.copy(buf, 2);
			buf[this.payload.length + 2] = buf.reduce(function (l, v) {
				return (l + v) % 256;
			}, 0);
			return buf;
		}
	}]);

	return Frame;
}();

exports.default = Frame;