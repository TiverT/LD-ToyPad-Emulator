'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Frame = require('./Frame');

var _Frame2 = _interopRequireDefault(_Frame);

var _constants = require('./constants');

var _constants2 = _interopRequireDefault(_constants);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Request = function () {
	function Request(data) {
		_classCallCheck(this, Request);

		_constants2.default.attach(this);
		if (data && data instanceof Buffer) data = new _Frame2.default(data);
		if (data && data instanceof _Frame2.default) this.parse(data);
	}

	_createClass(Request, [{
		key: 'parse',
		value: function parse(f) {
			this.frame = f;
			var p = f.payload;
			this.cmd = p[0];
			this.cid = p[1];
			this.payload = p.slice(2);
		}
	}, {
		key: 'build',
		value: function build() {
			this.frame = this.frame || new _Frame2.default();
			var b = new Buffer(this.payload.length + 2);
			b[0] = this.cmd;
			b[1] = this.cid;
			this.payload.copy(b, 2);
			this.frame.type = 0x55;
			this.frame.payload = b;
			return this.frame.build();
		}
	}]);

	return Request;
}();

exports.default = Request;