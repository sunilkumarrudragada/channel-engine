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
var Redis = require("ioredis");
var debug = require("debug")("redis-state-store");
var cloudWatchLog = require("./util.js").cloudWatchLog;
var DEFAULT_VOLATILE_KEY_TTL = 5; // Timeout so it should not expire within one normal increment iteration (in seconds)
function isTrue(s) {
    var regex = /^\s*(true|1)\s*$/i;
    return regex.test(s);
}
var REDIS_VERBOSE_LOG = process.env.REDIS_VERBOSE_LOG ? isTrue(process.env.REDIS_VERBOSE_LOG) : false;
var RedisStateStore = /** @class */ (function () {
    function RedisStateStore(keyPrefix, opts) {
        this.keyPrefix = keyPrefix;
        if (opts.version) {
            var prependPrefix = opts.version.replace(/\./g, "X");
            this.keyPrefix = prependPrefix + this.keyPrefix;
            debug("Prepending keyprefix with ".concat(prependPrefix, " => ").concat(this.keyPrefix));
        }
        this.volatileKeyTTL = DEFAULT_VOLATILE_KEY_TTL;
        if (opts.volatileKeyTTL) {
            debug("Overriding default, volatileKeyTTL=".concat(opts.volatileKeyTTL, "s"));
            this.volatileKeyTTL = opts.volatileKeyTTL;
        }
        this.client = new Redis(opts.redisUrl, { enableAutoPipelining: true });
    }
    RedisStateStore.prototype.initAsync = function (id, initData) {
        return __awaiter(this, void 0, void 0, function () {
            var isInitiated, data, _i, _a, key, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4 /*yield*/, this.getAsync(id, "_initiated")];
                    case 1:
                        isInitiated = _d.sent();
                        data = {};
                        if (!!isInitiated) return [3 /*break*/, 4];
                        debug("".concat(this.keyPrefix, ":").concat(id, ": Initiating keys ").concat(Object.keys(initData), " with init data"));
                        return [4 /*yield*/, this.setValues(id, initData)];
                    case 2:
                        _d.sent();
                        return [4 /*yield*/, this.setAsync(id, "_initiated", true)];
                    case 3:
                        _d.sent();
                        return [3 /*break*/, 8];
                    case 4:
                        debug("".concat(this.keyPrefix, ":").concat(id, ": Already initiated, not initiating with init data"));
                        _i = 0, _a = Object.keys(initData);
                        _d.label = 5;
                    case 5:
                        if (!(_i < _a.length)) return [3 /*break*/, 8];
                        key = _a[_i];
                        debug("".concat(this.keyPrefix, ":").concat(id, ": Initiating key ").concat(key, " with data from store"));
                        _b = data;
                        _c = key;
                        return [4 /*yield*/, this.getAsync(id, key)];
                    case 6:
                        _b[_c] = _d.sent();
                        _d.label = 7;
                    case 7:
                        _i++;
                        return [3 /*break*/, 5];
                    case 8: return [2 /*return*/, data];
                }
            });
        });
    };
    RedisStateStore.prototype.resetAsync = function (id, initData) {
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
    RedisStateStore.prototype.resetAllAsync = function () {
        return __awaiter(this, void 0, void 0, function () {
            var resetAsync;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        resetAsync = new Promise(function (resolve, reject) {
                            _this.client.flushall(function (err, reply) {
                                if (!err) {
                                    console.log("Flushed Redis db: ", reply);
                                    resolve();
                                }
                                else {
                                    reject(err);
                                }
                            });
                        });
                        return [4 /*yield*/, resetAsync];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    RedisStateStore.prototype.getValues = function (id, keys) {
        return __awaiter(this, void 0, void 0, function () {
            var pipeline, data, startMs, _loop_1, this_1, _i, keys_1, key, ops, ioTimeMs;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        pipeline = this.client.pipeline();
                        data = {};
                        startMs = Date.now();
                        _loop_1 = function (key) {
                            var storeKey = "" + this_1.keyPrefix + id + key;
                            pipeline.get(storeKey, function (err, reply) {
                                if (!err) {
                                    debug("REDIS get(pipeline) ".concat(storeKey, ":").concat(reply ? reply.length + " chars" : "null"));
                                    try {
                                        data[key] = JSON.parse(reply);
                                    }
                                    catch (err) {
                                        console.error("REDIS get(pipeline): Failed to parse ".concat(storeKey, " data: '").concat(reply, "'"));
                                    }
                                }
                            });
                        };
                        this_1 = this;
                        for (_i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
                            key = keys_1[_i];
                            _loop_1(key);
                        }
                        ops = pipeline.length;
                        return [4 /*yield*/, pipeline.exec()];
                    case 1:
                        _a.sent();
                        ioTimeMs = Date.now() - startMs;
                        cloudWatchLog(!REDIS_VERBOSE_LOG, 'redis', { event: 'getValues', operations: ops, ioTimeMs: ioTimeMs });
                        return [2 /*return*/, data];
                }
            });
        });
    };
    RedisStateStore.prototype.getAsync = function (id, key) {
        return __awaiter(this, void 0, void 0, function () {
            var startMs, storeKey, getAsync, data;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        startMs = Date.now();
                        storeKey = "" + this.keyPrefix + id + key;
                        getAsync = new Promise(function (resolve, reject) {
                            _this.client.get(storeKey, function (err, reply) {
                                var ioTimeMs = Date.now() - startMs;
                                debug("REDIS get ".concat(storeKey, ":").concat(reply ? reply.length + " chars" : "null", " (").concat(ioTimeMs, "ms) ").concat(ioTimeMs > 1000 ? 'REDISSLOW!' : ''));
                                if (!err) {
                                    var data_1;
                                    try {
                                        data_1 = JSON.parse(reply);
                                    }
                                    catch (err) {
                                        console.error("REDIS get: Failed to parse ".concat(storeKey, " data: '").concat(reply, "'"));
                                    }
                                    cloudWatchLog(!REDIS_VERBOSE_LOG, 'redis', { event: 'get', operations: 1, ioTimeMs: ioTimeMs });
                                    resolve(data_1);
                                }
                                else {
                                    reject(err);
                                }
                            });
                        });
                        return [4 /*yield*/, getAsync];
                    case 1:
                        data = _a.sent();
                        return [2 /*return*/, data];
                }
            });
        });
    };
    RedisStateStore.prototype.setValues = function (id, data) {
        return __awaiter(this, void 0, void 0, function () {
            var returnData, startMs, pipeline, _loop_2, this_2, _i, _a, key, ops, ioTimeMs;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        returnData = {};
                        startMs = Date.now();
                        pipeline = this.client.pipeline();
                        _loop_2 = function (key) {
                            var storeKey = "" + this_2.keyPrefix + id + key;
                            var value = data[key];
                            pipeline.set(storeKey, JSON.stringify(value), function (err, res) {
                                if (!err) {
                                    debug("REDIS set(pipeline) ".concat(storeKey, ": ").concat(res));
                                    returnData[key] = value;
                                }
                            });
                        };
                        this_2 = this;
                        for (_i = 0, _a = Object.keys(data); _i < _a.length; _i++) {
                            key = _a[_i];
                            _loop_2(key);
                        }
                        ops = pipeline.length;
                        return [4 /*yield*/, pipeline.exec()];
                    case 1:
                        _b.sent();
                        ioTimeMs = Date.now() - startMs;
                        cloudWatchLog(!REDIS_VERBOSE_LOG, 'redis', { event: 'setValues', operations: ops, ioTimeMs: ioTimeMs });
                        return [2 /*return*/, returnData];
                }
            });
        });
    };
    RedisStateStore.prototype.setAsync = function (id, key, value) {
        return __awaiter(this, void 0, void 0, function () {
            var startMs, storeKey, setAsync;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        startMs = Date.now();
                        storeKey = "" + this.keyPrefix + id + key;
                        setAsync = new Promise(function (resolve, reject) {
                            _this.client.set(storeKey, JSON.stringify(value), function (err, res) {
                                var ioTimeMs = Date.now() - startMs;
                                debug("REDIS set ".concat(storeKey, ": ").concat(res, " (").concat(ioTimeMs, "ms) ").concat(ioTimeMs > 1000 ? "REDISSLOW!" : ""));
                                if (!err) {
                                    cloudWatchLog(!REDIS_VERBOSE_LOG, 'redis', { event: 'set', operations: 1, ioTimeMs: ioTimeMs });
                                    resolve(value);
                                }
                                else {
                                    reject(err);
                                }
                            });
                        });
                        return [4 /*yield*/, setAsync];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    RedisStateStore.prototype.setVolatileAsync = function (id, key, value) {
        return __awaiter(this, void 0, void 0, function () {
            var data, storeKey, expireAsync;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.setAsync(id, key, value)];
                    case 1:
                        data = _a.sent();
                        storeKey = "" + this.keyPrefix + id + key;
                        expireAsync = new Promise(function (resolve, reject) {
                            _this.client.expire(storeKey, _this.volatileKeyTTL, function (err, res) {
                                if (!err) {
                                    debug("REDIS expire ".concat(storeKey, " ").concat(_this.volatileKeyTTL, "s: ").concat(res === 1 ? "OK" : "KEY DOES NOT EXIST"));
                                    resolve();
                                }
                                else {
                                    reject(err);
                                }
                            });
                        });
                        return [4 /*yield*/, expireAsync];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, data];
                }
            });
        });
    };
    RedisStateStore.prototype.removeAsync = function (id, key) {
        return __awaiter(this, void 0, void 0, function () {
            var startMs, storeKey, delAsync;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        startMs = Date.now();
                        storeKey = "" + this.keyPrefix + id + key;
                        delAsync = new Promise(function (resolve, reject) {
                            _this.client.del(storeKey, function (err, res) {
                                var ioTimeMs = Date.now() - startMs;
                                debug("REDIS remove ".concat(storeKey, ": (").concat(ioTimeMs, "ms) ").concat(ioTimeMs > 1000 ? "REDISSLOW!" : ""));
                                if (!err) {
                                    cloudWatchLog(!REDIS_VERBOSE_LOG, 'redis', { event: 'remove', operations: 1, ioTimeMs: ioTimeMs });
                                    resolve();
                                }
                                else {
                                    reject(err);
                                }
                            });
                        });
                        return [4 /*yield*/, delAsync];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return RedisStateStore;
}());
module.exports = RedisStateStore;
