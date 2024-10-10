"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _TEA = require('./TEA');

var _TEA2 = _interopRequireDefault(_TEA);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var rotr32 = function rotr32(a, b) {
	return (a >>> b | a << 32 - b) >>> 0;
};
var debug = false;

var CharCrypto = function () {
	function CharCrypto() {
		_classCallCheck(this, CharCrypto);
	}

	_createClass(CharCrypto, [{
		key: 'genkey',
		value: function genkey(uid) {
			return new Buffer(this.scramble(uid, 3) + this.scramble(uid, 4) + this.scramble(uid, 5) + this.scramble(uid, 6), 'hex');
		}
	}, {
		key: 'encrypt',
		value: function encrypt(uid, charid) {
			var tea = new _TEA2.default();
			tea.key = this.genkey(uid);
			var buf = new Buffer(8);
			buf.writeUInt32LE(charid, 0);
			buf.writeUInt32LE(charid, 4);
			var ret = tea.encrypt(buf);
			return process.browser ? ret.toString('hex') : ret;
		}
	}, {
		key: 'decrypt',
		value: function decrypt(uid, data) {
			if (typeof data == 'string') data = new Buffer(data, 'hex');
			var tea = new _TEA2.default();
			tea.key = this.genkey(uid);
			var buf = tea.decrypt(data);
			return buf.readUInt32LE(0);
		}
	}, {
		key: 'scramble',
		value: function scramble(uid, cnt) {
			var base = new Buffer([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xb7, 0xd5, 0xd7, 0xe6, 0xe7, 0xba, 0x3c, 0xa8, 0xd8, 0x75, 0x47, 0x68, 0xcf, 0x23, 0xe9, 0xfe, 0xaa]);
			uid = new Buffer(uid, 'hex');
			uid.copy(base);
			base[cnt * 4 - 1] = 0xaa;
			// base[30] = base[31] = 0xAA

			var v2 = 0;
			for (var i = 0; i < cnt; i++) {
				var v4 = rotr32(v2, 25);
				var v5 = rotr32(v2, 10);
				var b = base.readUInt32LE(i * 4);
				v2 = b + v4 + v5 - v2 >>> 0;
				if (debug) {
					console.log("[%d] %s %s %s %s", i, v4.toString(16), v5.toString(16), b.toString(16), v2.toString(16));
				}
			}

			var b = new Buffer(4);
			b.writeUInt32LE(v2, 0);
			return b.toString('hex');
		}
	}]);

	return CharCrypto;
}();

exports.default = CharCrypto;

function flipBytes(buf) {
	var out = new Buffer(buf.length);
	for (var i = 0; i < buf.length; i += 4) {
		out.writeUInt32BE(buf.readUInt32LE(i) >>> 0, i);
	}return out;
}