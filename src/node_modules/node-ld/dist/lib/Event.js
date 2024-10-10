'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Frame = require('./Frame');

var _Frame2 = _interopRequireDefault(_Frame);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Event = function () {
	function Event(data) {
		_classCallCheck(this, Event);

		if (data && data instanceof Buffer) data = new _Frame2.default(data);
		if (data && data instanceof _Frame2.default) this.parse(data);
		this.pad = data.pad || this.pad || 0;
		this.index = data.index || this.index || 0;
		this.dir = data.dir || this.dir || 0;
		this.uid = data.uid || this.uid || 0;
	}

	_createClass(Event, [{
		key: 'parse',
		value: function parse(f) {
			this.frame = f;
			var p = f.payload;
			// this.payload = p
			this.pad = p[0];
			this.index = p[2];
			this.dir = p[3];
			this.uid = p.slice(4).toString('hex');
		}
	}, {
		key: 'build',
		value: function build() {
			var b = new Buffer(11);
			b[0] = this.pad || 0;
			b[1] = 0;
			b[2] = this.index || 0;
			b[3] = this.dir & 0x1;
			var uid = new Buffer(this.uid, 'hex');
			uid.copy(b, 4);
			// 0b04a3bdfa54428001100000e6
			this.frame = this.frame || new _Frame2.default();
			this.frame.type = 0x56;
			this.frame.payload = b;
			return this.frame.build();
		}
	}]);

	return Event;
}();

exports.default = Event;