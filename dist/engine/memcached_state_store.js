var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var MemcacheClient = require("memcache-client");
var debug = require("debug")("memcached-state-store");
var MemcachedStateStore = /** @class */ (function () {
    function MemcachedStateStore(keyPrefix, opts) {
        this.keyPrefix = keyPrefix;
        if (opts.version) {
            var prependPrefix = opts.version.replace(/\./g, "X");
            this.keyPrefix = prependPrefix + this.keyPrefix;
            debug("Prepending keyprefix with ".concat(prependPrefix, " => ").concat(this.keyPrefix));
        }
        this.client = new MemcacheClient({ server: opts.memcachedUrl, cmdTimeout: 10000 });
    }
    MemcachedStateStore.prototype.initAsync = function (id, initData) {
        return __awaiter(this, void 0, void 0, function () {
            var isInitiated, data, _i, _a, key, _b, _c, _d, _e, key, _f, _g;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0: return [4 /*yield*/, this.getAsync(id, "_initiated")];
                    case 1:
                        isInitiated = _h.sent();
                        data = {};
                        if (!!isInitiated) return [3 /*break*/, 7];
                        _i = 0, _a = Object.keys(initData);
                        _h.label = 2;
                    case 2:
                        if (!(_i < _a.length)) return [3 /*break*/, 5];
                        key = _a[_i];
                        debug("".concat(this.keyPrefix, ":").concat(id, ": Initiating key ").concat(key, " with init data"));
                        _b = data;
                        _c = key;
                        return [4 /*yield*/, this.setAsync(id, key, initData[key])];
                    case 3:
                        _b[_c] = _h.sent();
                        _h.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [4 /*yield*/, this.setAsync(id, "_initiated", true)];
                    case 6:
                        _h.sent();
                        return [3 /*break*/, 11];
                    case 7:
                        debug("".concat(this.keyPrefix, ":").concat(id, ": Already initiated, not initiating with init data"));
                        _d = 0, _e = Object.keys(initData);
                        _h.label = 8;
                    case 8:
                        if (!(_d < _e.length)) return [3 /*break*/, 11];
                        key = _e[_d];
                        debug("".concat(this.keyPrefix, ":").concat(id, ": Initiating key ").concat(key, " with data from store"));
                        _f = data;
                        _g = key;
                        return [4 /*yield*/, this.getAsync(id, key)];
                    case 9:
                        _f[_g] = _h.sent();
                        _h.label = 10;
                    case 10:
                        _d++;
                        return [3 /*break*/, 8];
                    case 11: return [2 /*return*/, data];
                }
            });
        });
    };
    MemcachedStateStore.prototype.resetAsync = function (id, initData) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.setAsync(id, "_initiated", false)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.initAsync(id, initData)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    MemcachedStateStore.prototype.resetAllAsync = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                console.error("Shared Storage Reset Failed.\nMemcache-client: Flush All Command Not Implemented Yet");
                return [2 /*return*/];
            });
        });
    };
    MemcachedStateStore.prototype.getAsync = function (id, key) {
        return __awaiter(this, void 0, void 0, function () {
            var storeKey, data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        storeKey = "" + this.keyPrefix + id + key;
                        return [4 /*yield*/, this.client.get(storeKey)];
                    case 1:
                        data = _a.sent();
                        if (data) {
                            return [2 /*return*/, JSON.parse(data.value)];
                        }
                        return [2 /*return*/, null];
                }
            });
        });
    };
    MemcachedStateStore.prototype.setAsync = function (id, key, value) {
        return __awaiter(this, void 0, void 0, function () {
            var storeKey;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        storeKey = "" + this.keyPrefix + id + key;
                        return [4 /*yield*/, this.client.set(storeKey, JSON.stringify(value))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, value];
                }
            });
        });
    };
    MemcachedStateStore.prototype.setVolatileAsync = function (id, key, value) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new Error("memcached: setVolatileAsync not implemented yet");
            });
        });
    };
    MemcachedStateStore.prototype.removeAsync = function (id, key) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new Error("memcached: removeAsync not implemented yet");
            });
        });
    };
    return MemcachedStateStore;
}());
module.exports = MemcachedStateStore;
