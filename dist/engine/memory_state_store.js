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
var debug = require("debug")("memory-state-store");
var MemoryStateStore = /** @class */ (function () {
    function MemoryStateStore(type, opts) {
        this.sharedStates = {};
        this.globalSharedStates = {};
    }
    MemoryStateStore.prototype.initAsync = function (id, initData) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                if (!this.sharedStates[id]) {
                    this.sharedStates[id] = {};
                    Object.keys(initData).forEach(function (key) {
                        _this.sharedStates[id][key] = initData[key];
                    });
                }
                return [2 /*return*/, this.sharedStates[id]];
            });
        });
    };
    MemoryStateStore.prototype.resetAsync = function (id, initData) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.sharedStates[id] = null;
                        return [4 /*yield*/, this.initAsync(id, initData)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    MemoryStateStore.prototype.resetAllAsync = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.sharedStates = {};
                this.globalSharedStates = {};
                return [2 /*return*/];
            });
        });
    };
    MemoryStateStore.prototype.getAsync = function (id, key) {
        return __awaiter(this, void 0, void 0, function () {
            var value;
            return __generator(this, function (_a) {
                if (id === "" || id === null) {
                    value = this.globalSharedStates[key];
                }
                else {
                    if (!this.sharedStates[id]) {
                        return [2 /*return*/, null];
                    }
                    value = this.sharedStates[id][key];
                }
                return [2 /*return*/, value];
            });
        });
    };
    MemoryStateStore.prototype.setAsync = function (id, key, value) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (id === "" || id === null) {
                    this.globalSharedStates[key] = value;
                }
                else {
                    if (!this.sharedStates[id]) {
                        this.sharedStates[id] = {};
                    }
                    this.sharedStates[id][key] = value;
                    return [2 /*return*/, this.sharedStates[id][key]];
                }
                return [2 /*return*/];
            });
        });
    };
    MemoryStateStore.prototype.setVolatileAsync = function (id, key, value) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.setAsync(id, key, value)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    MemoryStateStore.prototype.removeAsync = function (id, key) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                delete this.sharedStates[id][key];
                return [2 /*return*/];
            });
        });
    };
    return MemoryStateStore;
}());
module.exports = MemoryStateStore;
