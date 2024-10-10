'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Tag = function () {
	function Tag(data) {
		_classCallCheck(this, Tag);

		this.TAG_SIZE = 180;
		this.PAGE_SIZE = 4;
		this.PAGES_PER_READ = 4;
		this.data = data || new Buffer(this.TAG_SIZE);
	}

	_createClass(Tag, [{
		key: 'get',
		value: function get(page) {
			var start = page * this.PAGE_SIZE;
			var end = start + this.PAGE_SIZE;
			return this.data.slice(start, end);
		}
	}, {
		key: 'set',
		value: function set(page, data) {
			var start = page * this.PAGE_SIZE;
			data.copy(this.data, start);
		}
	}, {
		key: 'readFile',
		value: function readFile(file, cb) {
			var self = this;
			cb = cb || function () {};
			fs.readFile(file, function (err, data) {
				if (err) return cb(err);
				self.data = data;
				self.init();
				cb();
			});
		}
	}, {
		key: 'writeFile',
		value: function writeFile(file, cb) {
			cb = cb || function () {};
			fs.writeFile(file, this.data, function (err) {
				cb(err);
			});
		}
	}, {
		key: 'uid',
		get: function get() {
			return this.data.slice(0, 3).toString('hex') + this.data.slice(4, 8).toString('hex');
		}
	}]);

	return Tag;
}();

exports.default = Tag;