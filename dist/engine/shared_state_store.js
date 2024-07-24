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
var debug = require("debug")("engine-state-store");
var RedisStateStore = require("./redis_state_store.js");
var MemcachedStateStore = require("./memcached_state_store.js");
var MemoryStateStore = require("./memory_state_store.js");
var SharedStateStore = /** @class */ (function () {
    function SharedStateStore(type, opts, initData) {
        this.initData = initData;
        this.type = type;
        this.cache = {};
        this.cacheTTL = opts && opts.cacheTTL ? opts.cacheTTL : 1000;
        this.shared = false;
        this.hasPipeline = false;
        if (opts && opts.redisUrl) {
            debug("Using REDIS (".concat(opts.redisUrl, ") for shared state store (").concat(type, ", cacheTTL=").concat(this.cacheTTL, ")"));
            this.store = new RedisStateStore("".concat(type, ":"), opts);
            this.shared = true;
            this.hasPipeline = true;
        }
        else if (opts && opts.memcachedUrl) {
            debug("Using MEMCACHED (".concat(opts.memcachedUrl, ") for shared state store (").concat(type, ", cacheTTL=").concat(this.cacheTTL, ")"));
            this.store = new MemcachedStateStore("".concat(type, ":"), opts);
            this.shared = true;
        }
        else {
            debug("Using MEMORY for non-shared state store (".concat(type, ", cacheTTL=").concat(this.cacheTTL, ")"));
            this.store = new MemoryStateStore("".concat(type, ":"), opts);
        }
    }
    SharedStateStore.prototype.isShared = function () {
        return this.shared;
    };
    SharedStateStore.prototype.canPipeline = function () {
        return this.hasPipeline;
    };
    SharedStateStore.prototype.init = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.store.initAsync(id, this.initData)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    SharedStateStore.prototype.reset = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.store.resetAsync(id, this.initData)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    SharedStateStore.prototype.resetAll = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.store.resetAllAsync()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    SharedStateStore.prototype.get = function (id, key) {
        return __awaiter(this, void 0, void 0, function () {
            var data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.store.getAsync(id, key)];
                    case 1:
                        data = _a.sent();
                        //debug(key !== "currentVod" ? data : (data ? "not null" : "null" ));
                        return [2 /*return*/, data];
                }
            });
        });
    };
    SharedStateStore.prototype.set = function (id, key, value) {
        return __awaiter(this, void 0, void 0, function () {
            var data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.store.setAsync(id, key, value)];
                    case 1:
                        data = _a.sent();
                        return [2 /*return*/, data];
                }
            });
        });
    };
    SharedStateStore.prototype.setVolatile = function (id, key, value) {
        return __awaiter(this, void 0, void 0, function () {
            var data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.store.setVolatileAsync(id, key, value)];
                    case 1:
                        data = _a.sent();
                        return [2 /*return*/, data];
                }
            });
        });
    };
    SharedStateStore.prototype.getValues = function (id, keys) {
        return __awaiter(this, void 0, void 0, function () {
            var data, _i, keys_1, key, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        data = {};
                        if (!this.hasPipeline) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.store.getValues(id, keys)];
                    case 1:
                        data = _c.sent();
                        return [3 /*break*/, 6];
                    case 2:
                        _i = 0, keys_1 = keys;
                        _c.label = 3;
                    case 3:
                        if (!(_i < keys_1.length)) return [3 /*break*/, 6];
                        key = keys_1[_i];
                        _a = data;
                        _b = key;
                        return [4 /*yield*/, this.get(id, key)];
                    case 4:
                        _a[_b] = _c.sent();
                        _c.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 3];
                    case 6: return [2 /*return*/, data];
                }
            });
        });
    };
    SharedStateStore.prototype.setValues = function (id, data) {
        return __awaiter(this, void 0, void 0, function () {
            var returnData, _i, _a, key, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        returnData = {};
                        if (!this.hasPipeline) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.store.setValues(id, data)];
                    case 1:
                        returnData = _d.sent();
                        return [3 /*break*/, 6];
                    case 2:
                        _i = 0, _a = Object.keys(data);
                        _d.label = 3;
                    case 3:
                        if (!(_i < _a.length)) return [3 /*break*/, 6];
                        key = _a[_i];
                        _b = returnData;
                        _c = key;
                        return [4 /*yield*/, this.set(id, key, data[key])];
                    case 4:
                        _b[_c] = _d.sent();
                        _d.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 3];
                    case 6: return [2 /*return*/, returnData];
                }
            });
        });
    };
    SharedStateStore.prototype.remove = function (id, key) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.store.removeAsync(id, key)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return SharedStateStore;
}());
module.exports = SharedStateStore;
