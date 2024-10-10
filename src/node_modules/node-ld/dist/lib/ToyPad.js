'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _util = require('util');

var util = _interopRequireWildcard(_util);

var _constants = require('./constants');

var _constants2 = _interopRequireDefault(_constants);

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

var _Event = require('./Event');

var _Event2 = _interopRequireDefault(_Event);

var _Request = require('./Request');

var _Request2 = _interopRequireDefault(_Request);

var _Response = require('./Response');

var _Response2 = _interopRequireDefault(_Response);

var _Burtle = require('./Burtle');

var _Burtle2 = _interopRequireDefault(_Burtle);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var transports = {
	get HIDTransport() {
		return require('../transports/hid');
	},
	get LibUSBTransport() {
		return require('../transports/libusb');
	},
	get ChromeHIDTransport() {
		return require('../transports/chromehid');
	}
};

var ToyPad = function (_EventEmitter) {
	_inherits(ToyPad, _EventEmitter);

	function ToyPad(opts) {
		_classCallCheck(this, ToyPad);

		opts = opts || {};

		var _this = _possibleConstructorReturn(this, (ToyPad.__proto__ || Object.getPrototypeOf(ToyPad)).call(this, opts));

		if (!opts.transport && opts.transport !== false) {
			if (process.browser) opts.transport = new transports.ChromeHIDTransport();else if (process.platform == 'linux') opts.transport = new transports.LibUSBTransport();else opts.transport = new transports.HIDTransport();
		}
		if (opts.transport) _this.setTransport(opts.transport);
		_constants2.default.attach(_this);
		_this.callbacks = {};
		_this.lastid = 0x00;
		_this.burtle = new _Burtle2.default();
		_this.burtle.init(0);

		_this.errInvalid = opts.errInvalid || true;

		_this.on('response', _this.processCallback.bind(_this));
		return _this;
	}

	_createClass(ToyPad, [{
		key: 'getID',
		value: function getID() {
			return ++this.lastid % 256;
		}
	}, {
		key: '_write',
		value: function _write(data) {
			// console.log('_write',data)
			if (this.transport) this.transport.write(data);else throw new Error('Transport not set');
		}
	}, {
		key: 'setTransport',
		value: function setTransport(transport) {
			var _this2 = this;

			this.transport = transport;
			this.transport.on('data', function (data) {
				_this2.emit('raw', data);
				if (data[0] == 0x55) _this2.emit('response', new _Response2.default(data));
				if (data[0] == 0x56) _this2.emit('event', new _Event2.default(data));
			});
			this.transport.on('ready', function () {
				return _this2.emit('ready');
			});
		}
	}, {
		key: 'rand',
		value: function rand() {
			return this.burtle.rand();
		}
	}, {
		key: 'request',
		value: function request(cmd, payload, cb) {
			var req = new _Request2.default();
			req.cmd = cmd;
			req.cid = this.getID();
			req.payload = payload;
			this.registerCallback(req, cb);
			this.emit('request', req);
			this._write(req.build());
		}
	}, {
		key: 'registerCallback',
		value: function registerCallback(req, cb) {
			var cid = req.cid || req;
			this.callbacks[cid] = cb || function () {};
			if (this.callbackDebug) console.log('callback registered', cid);
		}
	}, {
		key: 'processCallback',
		value: function processCallback(resp) {
			var cid = resp.cid;
			var cb = this.callbacks[cid];
			var err = null;
			if (cb) {
				delete this.callbacks[cid];
				if (this.errInvalid && resp.payload[0] & 0xF) err = new Error('Invalid 0x' + resp.payload[0].toString(16));
				cb(err, resp);
				if (this.callbackDebug) console.log('callback processed', cid);
			}
		}
	}, {
		key: 'wake',
		value: function wake(cb) {
			this.request(this.CMD_WAKE, new Buffer('(c) LEGO 2014'), cb);
		}
	}, {
		key: 'seed',
		value: function seed(_seed, cb) {
			this.burtle.init(_seed);
			var b = new Buffer(8);
			b.fill(0);
			b.writeUInt32BE(_seed, 0);
			this.request(this.CMD_SEED, b, cb);
		}
	}, {
		key: 'chal',
		value: function chal(data, cb) {
			var b = new Buffer(8);
			b.fill(0);
			this.request(this.CMD_CHAL, b, cb);
		}
	}, {
		key: 'color',
		value: function color(p, rgb, cb) {
			rgb = hextorgb(rgb);
			this.request(this.CMD_COL, new Buffer([p, rgb.r, rgb.g, rgb.b]), cb);
		}
	}, {
		key: 'colorAll',
		value: function colorAll(rgb1, rgb2, rgb3, cb) {
			rgb1 = hextorgb(rgb1);
			rgb2 = hextorgb(rgb2);
			rgb3 = hextorgb(rgb3);
			this.request(this.CMD_COLAL, new Buffer([1, rgb1.r, rgb1.g, rgb1.b, 2, rgb2.r, rgb2.g, rgb2.b, 3, rgb3.r, rgb3.g, rgb3.b]), cb);
		}
	}, {
		key: 'getPadColor',
		value: function getPadColor(pad, cb) {
			// Subtract 1 here to match the Pad values used in color (1,2,3)
			this.request(this.CMD_GETCOL, new Buffer([pad - 1]), cb);
		}
	}, {
		key: 'fade',
		value: function fade(p, s, c, rgb, cb) {
			rgb = hextorgb(rgb);
			this.request(this.CMD_FADE, new Buffer([p, s, c, rgb.r, rgb.g, rgb.b]), cb);
		}
	}, {
		key: 'fadeRandom',
		value: function fadeRandom(p, s, c, cb) {
			this.request(this.CMD_FADRD, new Buffer([p, s, c]), cb);
		}
	}, {
		key: 'fadeAll',
		value: function fadeAll(s1, c1, rgb1, s2, c2, rgb2, s3, c3, rgb3, cb) {
			rgb1 = hextorgb(rgb1);
			rgb2 = hextorgb(rgb2);
			rgb3 = hextorgb(rgb3);
			this.request(this.CMD_FADAL, new Buffer([1, s1, c1, rgb1.r, rgb1.g, rgb1.b, 1, s2, c2, rgb2.r, rgb2.g, rgb2.b, 1, s3, c3, rgb3.r, rgb3.g, rgb3.b]), cb);
		}

		// onoff how long it stays off and on, [5,10] would mean it stays off-color 5 ticks, previous color 10 ticks.

	}, {
		key: 'flash',
		value: function flash(pad, onoff, count, offRGB, cb) {
			offRGB = hextorgb(offRGB);
			this.request(this.CMD_FLASH, new Buffer([pad, onoff[0], onoff[1], count, offRGB.r, offRGB.g, offRGB.b]), cb);
		}
	}, {
		key: 'flashAll',
		value: function flashAll(onoff1, a1, rgb1, onoff2, a2, rgb2, onoff3, a3, rgb3, cb) {
			rgb1 = hextorgb(rgb1);
			rgb2 = hextorgb(rgb2);
			rgb3 = hextorgb(rgb3);
			this.request(this.CMD_FLSAL, new Buffer([1, onoff1[0], onoff1[1], a1, rgb1.r, rgb1.g, rgb1.b, 1, onoff2[0], onoff2[1], a2, rgb2.r, rgb2.g, rgb2.b, 1, onoff3[0], onoff3[1], a3, rgb3.r, rgb3.g, rgb3.b]), cb);
		}
	}, {
		key: 'tagList',
		value: function tagList(cb) {
			this.request(this.CMD_TGLST, new Buffer([]), cb);
		}
	}, {
		key: 'read',
		value: function read(index, page, cb) {
			this.request(this.CMD_READ, new Buffer([index, page]), cb);
		}
	}, {
		key: 'write',
		value: function write(index, page, data, cb) {
			var buf = new Buffer(6);
			buf[0] = index;
			buf[1] = page;
			data.copy(buf, 2);
			this.request(this.CMD_WRITE, buf, cb);
		}
	}, {
		key: 'model',
		value: function model(data, cb) {
			this.request(this.CMD_MODEL, data, cb);
		}

		// The Lego pad automatically sends a PWD based on UID of the tag.
		// This CMD appears to configure this feature, valid types are:
		// 0 - Disable PWD Send, 1 - Enable default PWD algorithm, 2 - Custom PWD sent as 4 bytes
		// The index argument appears to not function properly (it will error if there is no tag on given index), but some indexes are always valid such as 84, if anyone knows why...
		// The effect is global until another PWD change

	}, {
		key: 'pwd',
		value: function pwd(type, _pwd, cb) {
			var buf = new Buffer(6);
			if (type < 2) buf.fill(0);else _pwd.copy(buf, 2);
			buf[0] = 84; //Possible tag index?
			buf[1] = type;
			this.request(this.CMD_PWD, buf, cb);
		}

		// This appears to halt NFC operations until another read/write/pause is called.
		// State values: true, false

	}, {
		key: 'active',
		value: function active(state, cb) {
			if (state) this.request(this.CMD_ACTIVE, new Buffer([1]), cb);else this.request(this.CMD_ACTIVE, new Buffer([0]), cb);
		}
	}]);

	return ToyPad;
}(_events2.default);

exports.default = ToyPad;

function hextorgb(hex) {
	hex = hex.replace(/#/, '');
	var ret = [parseInt('0x' + hex.slice(0, 2)), parseInt('0x' + hex.slice(2, 4)), parseInt('0x' + hex.slice(4, 6))];
	ret.r = ret[0];ret.g = ret[1];ret.b = ret[2];
	return ret;
}