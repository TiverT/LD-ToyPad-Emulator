"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _constants = require('./constants');

var _constants2 = _interopRequireDefault(_constants);

var _util = require('util');

var util = _interopRequireWildcard(_util);

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

var _Request = require('./Request');

var _Request2 = _interopRequireDefault(_Request);

var _Response = require('./Response');

var _Response2 = _interopRequireDefault(_Response);

var _Event = require('./Event');

var _Event2 = _interopRequireDefault(_Event);

var _raw = require('../transports/raw');

var _raw2 = _interopRequireDefault(_raw);

var _Burtle = require('./Burtle');

var _Burtle2 = _interopRequireDefault(_Burtle);

var _TEA = require('./TEA');

var _TEA2 = _interopRequireDefault(_TEA);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ToyPadEmu = function (_EventEmitter) {
	_inherits(ToyPadEmu, _EventEmitter);

	function ToyPadEmu(opts) {
		_classCallCheck(this, ToyPadEmu);

		opts = opts || {};

		var _this = _possibleConstructorReturn(this, (ToyPadEmu.__proto__ || Object.getPrototypeOf(ToyPadEmu)).call(this, opts));

		if (!opts.transport && opts.transport !== false) opts.transport = new _raw2.default('/dev/hidg0');
		if (opts.transport) _this.setTransport(opts.transport);
		_constants2.default.attach(_this);
		_this._tokens = [];
		_this._hooks = [];
		_this._builtinHooks = [];
		_this._evqueue = [];
		_this.burtle = new _Burtle2.default();
		_this.tea = new _TEA2.default();
		_this.tea.key = new Buffer([0x55, 0xFE, 0xF6, 0xB0, 0x62, 0xBF, 0x0B, 0x41, 0xC9, 0xB3, 0x7C, 0xB4, 0x97, 0x3E, 0x29, 0x7B]);
		_this.on('request', _this.processRequest.bind(_this));
		setInterval(function () {
			while (_this._evqueue.length) {
				console.log('EVENT:', _this._evqueue[0]);
				_this._write(_this._evqueue.shift().build());
			}
		}, 500);
		return _this;
	}

	_createClass(ToyPadEmu, [{
		key: 'pad',
		value: function pad(_pad) {
			return this._tokens.filter(function (t) {
				return t.pad == _pad;
			});
		}
	}, {
		key: 'place',
		value: function place(token, pad, index, uid) {
			if (this.pad(pad).length == (pad == 1 ? 1 : 3)) return false;
			var nt = {
				index: index || this._tokens.map(function (v) {
					return v.index;
				}).reduceRight(function (l, v, i) {
					return v > i ? l - 1 : l;
				}, this._tokens.length),
				pad: pad,
				uid: uid,
				token: token
			};
			this.tagPlaceEvent(nt);
			this._tokens.push(nt);
			this._tokens.sort(function (a, b) {
				return b.index - a.index;
			});
			return nt;
		}
	}, {
		key: 'remove',
		value: function remove(tag) {
			if (typeof tag == 'number') tag = this._tokens.filter(function (v) {
				return v.index == tag;
			})[0];
			var ind = this._tokens.indexOf(tag);
			this._tokens.splice(ind, 1);
			this.tagRemoveEvent(tag);
		}
	}, {
		key: 'tagPlaceEvent',
		value: function tagPlaceEvent(tag) {
			var ev = new _Event2.default(tag);
			ev.dir = 0;
			this._evqueue.push(ev);
		}
	}, {
		key: 'tagRemoveEvent',
		value: function tagRemoveEvent(tag) {
			var ev = new _Event2.default(tag);
			ev.dir = 1;
			this._evqueue.push(ev);
		}
	}, {
		key: '_write',
		value: function _write(data) {
			if (this.transport) this.transport.write(data);else throw new Error('Transport not set');
		}
	}, {
		key: 'setTransport',
		value: function setTransport(transport) {
			var _this2 = this;

			this.transport = transport;
			this.transport.on('data', function (data) {
				_this2.emit('request', new _Request2.default(data));
			});
		}
	}, {
		key: 'processRequest',
		value: function processRequest(req) {
			var res = new _Response2.default();
			res.cid = req.cid;
			res.payload = new Buffer(0);
			var active = function active(h) {
				return h.cmd == req.cmd || h.cmd == 0;
			};
			this._hooks.filter(active).forEach(function (h) {
				return h.cb(req, res);
			});
			if (res._cancel) return;
			if (!res._preventDefault) this._builtinHooks.filter(active).forEach(function (h) {
				return h.cb(req, res);
			});
			if (res._cancel) return;
			this.emit('response', res);
			this._write(res.build());
		}
	}, {
		key: 'hook',
		value: function hook(cmd, cb) {
			if (typeof type == 'function') {
				cb = cmd;cmd = 0;
			}
			this._hooks.push({
				cmd: cmd,
				cb: cb
			});
		}
	}, {
		key: '_hook',
		value: function _hook(cmd, cb) {
			if (typeof type == 'function') {
				cb = cmd;cmd = 0;
			}
			this._builtinHooks.push({
				cmd: cmd,
				cb: cb
			});
		}
	}, {
		key: 'addEvent',
		value: function addEvent(ev) {
			this._evqueue.push(ev);
		}
	}, {
		key: 'randomUID',
		value: function randomUID() {
			var uid = new Buffer(7);
			uid[0] = 0x04; // vendor id 04 = NXP
			uid[6] = 0x80; // for whatever reason the last byte of the UID is mostly 0x8*
			for (var i = 1; i < 6; i++) {
				uid[i] = Math.round(Math.random() * 256) % 256;
			}return uid.toString('hex').toUpperCase();
		}
	}, {
		key: 'registerDefaults',
		value: function registerDefaults() {
			var _this3 = this;

			this._hook(this.CMD_WAKE, function (req, res) {
				console.log('REQUEST (CMD_WAKE)');
				res.payload = new Buffer('286329204c45474f2032303134', 'hex');
				_this3._tokens.forEach(function (ev) {
					return _this3.tagPlaceEvent(ev);
				});
			});

			this._hook(this.CMD_READ, function (req, res) {
				var ind = req.payload[0];
				var page = req.payload[1];
				console.log('REQUEST (CMD_READ): index:', ind, 'page', page);
				res.payload = new Buffer(17);
				res.payload[0] = 0;
				var start = page * 4;
				var token = _this3._tokens.find(function (t) {
					return t.index == ind;
				});
				//console.log(token)
				if (token) token.token.copy(res.payload, 1, start, start + 16);
			});

			this._hook(this.CMD_MODEL, function (req, res) {
				req.payload = _this3.decrypt(req.payload);
				var index = req.payload.readUInt8(0);
				var conf = req.payload.readUInt32BE(4);
				console.log('REQUEST (CMD_MODEL): index:', index, 'conf:', conf);
				var token = _this3._tokens.find(function (t) {
					return t.index == index;
				});
				//console.log(token)
				var buf = new Buffer(8);
				buf.writeUInt32BE(conf, 4);
				res.payload = new Buffer(9);
				if (token) {
					if (token.token.id) buf.writeUInt32LE(token.token.id || 0, 0);else res.payload[0] = 0xF9;
				} else res.payload[0] = 0xF2;
				//console.log('D4',index,buf)
				_this3.encrypt(buf).copy(res.payload, 1);
			});

			this._hook(this.CMD_SEED, function (req, res) {
				req.payload = _this3.decrypt(req.payload);
				var seed = req.payload.readUInt32LE(0);
				var conf = req.payload.readUInt32BE(4);
				_this3.burtle.init(seed);
				console.log('REQUEST (CMD_SEED): seed:', seed, 'conf', conf);
				res.payload = new Buffer(8);
				res.payload.fill(0);
				res.payload.writeUInt32BE(conf, 0);
				res.payload = _this3.encrypt(res.payload);
			});

			this._hook(this.CMD_CHAL, function (req, res) {
				req.payload = _this3.decrypt(req.payload);

				var conf = req.payload.readUInt32BE(0);
				console.log('REQUEST (CMD_CHAL): conf:', conf);
				res.payload = new Buffer(8);
				var rand = _this3.burtle.rand();
				//console.log('RNG',rand.toString(16))
				res.payload.writeUInt32LE(rand, 0);
				//console.log('response payload before encryption:',res.payload)
				res.payload.writeUInt32BE(conf, 4);
				res.payload = _this3.encrypt(res.payload);
			});
		}
	}, {
		key: 'encrypt',
		value: function encrypt(buffer) {
			return this.tea.encrypt(buffer);
		}
	}, {
		key: 'decrypt',
		value: function decrypt(buffer) {
			return this.tea.decrypt(buffer);
		}
	}, {
		key: 'pad1',
		get: function get() {
			return this.pad(1);
		}
	}, {
		key: 'pad2',
		get: function get() {
			return this.pad(2);
		}
	}, {
		key: 'pad3',
		get: function get() {
			return this.pad(3);
		}
	}]);

	return ToyPadEmu;
}(_events2.default);

exports.default = ToyPadEmu;