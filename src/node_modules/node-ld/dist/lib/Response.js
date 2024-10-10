'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Frame = require('./Frame');

var _Frame2 = _interopRequireDefault(_Frame);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Response = function () {
	function Response(data) {
		_classCallCheck(this, Response);

		if (data && data instanceof Buffer) data = new _Frame2.default(data);
		if (data && data instanceof _Frame2.default) this.parse(data);
	}

	_createClass(Response, [{
		key: 'parse',
		value: function parse(f) {
			this.frame = f;
			var p = f.payload;
			this.cid = p[0];
			this.payload = p.slice(1);
		}
	}, {
		key: 'build',
		value: function build() {
			this.frame = this.frame || new _Frame2.default();
			var b = new Buffer(this.payload.length + 1);
			b[0] = this.cid;
			this.payload.copy(b, 1);
			this.frame.type = 0x55;
			this.frame.payload = b;
			return this.frame.build();
		}
	}, {
		key: 'preventDefault',
		value: function preventDefault() {
			this._preventDefault = true;
		}
	}, {
		key: 'cancel',
		value: function cancel() {
			this._cancel = true;
		}
	}]);

	return Response;
}();

exports.default = Response;