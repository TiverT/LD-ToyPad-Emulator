"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var JSONRPC = function () {
	function JSONRPC(base) {
		_classCallCheck(this, JSONRPC);

		if (!base) throw new Error('base is required');
		this.base = base;
		this.PARSE_ERROR = this.error(-32700, 'Parse Error');
		this.INVALID_REQUEST = this.error(-32600, 'Invalid Request');
		this.METHOD_NOT_FOUND = this.error(-32601, 'Method not found');
		this.INVALID_PARAMS = this.error(-32602, 'Invalid Params');
		this.INTERNAL_ERROR = this.error(-32603, 'Internal Error');
	}

	_createClass(JSONRPC, [{
		key: 'handleRequest',
		value: function handleRequest(req, res) {
			var self = this;
			var buffer = '';
			req.on('data', function (data) {
				return buffer += data.toString();
			});
			req.on('end', function () {
				try {
					var data = JSON.parse(buffer);
					var ret = [];
					if (data instanceof Array) {
						async.map(data, self.doRPC.bind(self), function (err, resp) {
							return res.json(err || resp.filter(function (v) {
								return v;
							}));
						});
					} else self.doRPC(data, function (err, resp) {
						return res.json(err || resp);
					});
				} catch (ex) {
					console.error('JSONRPC ERROR', ex);
					if (ex instanceof SyntaxError) res.json(self.PARSE_ERROR);else res.json(self.INTERNAL_ERROR, ex);
				}
			});
		}
	}, {
		key: 'doRPC',
		value: function doRPC(data, cb) {
			var _self$base;

			var self = this;
			data.params = data.params || [];
			if (data.jsonrpc != '2.0') return cb(null, self.INVALID_REQUEST);
			if (!data.method) return cb(null, self.INVALID_REQUEST);
			if (!self.base[data.method]) return cb(null, self.METHOD_NOT_FOUND);

			(_self$base = self.base)[data.method].apply(_self$base, _toConsumableArray(data.params).concat([function (err, resp) {
				var ret = {};
				if (err) ret = self.error(-32000, ret.err.toString());else ret = self.success(resp.payload.toJSON().data);
				if (data.id) ret.id = data.id;else ret = null;
				cb(null, ret);
			}]));
		}
	}, {
		key: 'success',
		value: function success(result) {
			var ret = {
				jsonrpc: '2.0',
				result: result
			};
			if (this.rpcDebug) console.log('success', ret);
			return ret;
		}
	}, {
		key: 'error',
		value: function error(code, msg, data) {
			var ret = {
				jsonrpc: '2.0',
				error: {
					code: code,
					message: msg
				}
			};
			if (data) ret.error.data = data;
			if (this.rpcDebug) console.log('error', ret);
			return ret;
		}
	}]);

	return JSONRPC;
}();

exports.default = JSONRPC;