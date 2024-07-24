var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
var HLSVod = require('@eyevinn/hls-vodtolive');
var SharedStateStore = require('./shared_state_store.js');
var debug = require("debug")("session-state-store");
var timeLeft = require('./util.js').timeLeft;
var SessionState = Object.freeze({
    VOD_INIT: 1,
    VOD_PLAYING: 2,
    VOD_NEXT_INIT: 3,
    VOD_NEXT_INITIATING: 4,
    VOD_RELOAD_INIT: 5,
    VOD_RELOAD_INITIATING: 6
});
var CURRENTVOD_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
var SharedSessionState = /** @class */ (function () {
    function SharedSessionState(store, sessionId, instanceId, opts) {
        this.sessionId = sessionId;
        this.instanceId = instanceId;
        this.cache = {
            currentVod: {
                ts: 0,
                ttl: CURRENTVOD_CACHE_TTL,
                value: null
            }
        };
        if (opts && opts.cacheTTL) {
            this.cacheTTL = opts.cacheTTL;
        }
        else {
            throw new Error("need to specify cache TTL");
        }
        this.store = store;
    }
    SharedSessionState.prototype.clearCurrentVodCache = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                debug("[".concat(this.sessionId, "]: clearing 'currentVod' cache"));
                this.cache.currentVod.value = null;
                return [2 /*return*/];
            });
        });
    };
    SharedSessionState.prototype.getCurrentVod = function () {
        return __awaiter(this, void 0, void 0, function () {
            var currentVod, hlsVod, strToMB;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.sessionId) {
                            throw new Error("shared session state store has not been initialized");
                        }
                        if (this.cache.currentVod.value && Date.now() < this.cache.currentVod.ts + this.cache.currentVod.ttl) {
                            debug("[".concat(this.sessionId, "]: reading 'currentVod' from cache. Expires in ").concat(timeLeft(this.cache.currentVod.ts + this.cache.currentVod.ttl, Date.now())));
                            return [2 /*return*/, this.cache.currentVod.value];
                        }
                        return [4 /*yield*/, this.get("currentVod")];
                    case 1:
                        currentVod = _a.sent();
                        hlsVod = null;
                        if (!currentVod) return [3 /*break*/, 5];
                        if (!this.store.isShared()) return [3 /*break*/, 4];
                        strToMB = function (str) {
                            var bytesPerCharacter = 2; // Assuming each character takes around 2 bytes in memory
                            var stringSizeBytes = str.length * bytesPerCharacter;
                            var sizeInMegabytes = stringSizeBytes / (1024 * 1024);
                            return sizeInMegabytes.toFixed(1);
                        };
                        debug("[".concat(this.sessionId, "]: reading ").concat(currentVod.length, " characters or (").concat(strToMB(currentVod), " MB) from shared store (").concat(Date.now(), " < ").concat(this.cache.currentVod.ts + this.cache.currentVod.ttl, ")"));
                        hlsVod = new HLSVod();
                        hlsVod.fromJSON(currentVod);
                        if (!hlsVod.skipSerializeMediaSequences) return [3 /*break*/, 3];
                        return [4 /*yield*/, hlsVod.generateMediaSequences()];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [3 /*break*/, 5];
                    case 4:
                        hlsVod = currentVod;
                        _a.label = 5;
                    case 5:
                        this.cache.currentVod.ts = Date.now();
                        this.cache.currentVod.value = hlsVod;
                        return [2 /*return*/, hlsVod];
                }
            });
        });
    };
    SharedSessionState.prototype.setCurrentVod = function (hlsVod, opts) {
        return __awaiter(this, void 0, void 0, function () {
            var isLeader, currentVod;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.sessionId) {
                            throw new Error("shared session state store has not been initialized");
                        }
                        if (!this.store.isShared()) return [3 /*break*/, 8];
                        return [4 /*yield*/, this.store.clearLeaderCache()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.store.isLeader(this.instanceId)];
                    case 2:
                        isLeader = _a.sent();
                        if (!isLeader) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.set("currentVod", hlsVod.toJSON())];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 4:
                        debug("[".concat(this.sessionId, "]: Not a leader. Will not overwrite. Getting currentVod in shared store"));
                        return [4 /*yield*/, this.get("currentVod")];
                    case 5:
                        currentVod = _a.sent();
                        hlsVod = new HLSVod();
                        hlsVod.fromJSON(currentVod);
                        if (!hlsVod.skipSerializeMediaSequences) return [3 /*break*/, 7];
                        return [4 /*yield*/, hlsVod.generateMediaSequences()];
                    case 6:
                        _a.sent();
                        _a.label = 7;
                    case 7: return [3 /*break*/, 10];
                    case 8: return [4 /*yield*/, this.set("currentVod", hlsVod)];
                    case 9:
                        _a.sent();
                        _a.label = 10;
                    case 10:
                        if (this.cache.currentVod) {
                            this.cache.currentVod.ts = Date.now();
                            this.cache.currentVod.ttl = CURRENTVOD_CACHE_TTL;
                            if (opts && opts.ttl) {
                                this.cache.currentVod.ttl = opts.ttl;
                            }
                            debug("[".concat(this.sessionId, "]: TTL for current VOD is ").concat(this.cache.currentVod.ttl, "ms"));
                            this.cache.currentVod.value = hlsVod;
                        }
                        return [2 /*return*/, this.cache.currentVod.value];
                }
            });
        });
    };
    SharedSessionState.prototype.get = function (key) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.store.get(this.sessionId, key)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    SharedSessionState.prototype.getValues = function (keys) {
        return __awaiter(this, void 0, void 0, function () {
            var values;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.store.getValues(this.sessionId, keys)];
                    case 1:
                        values = _a.sent();
                        //debug(values);
                        return [2 /*return*/, values];
                }
            });
        });
    };
    SharedSessionState.prototype.set = function (key, value) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.store.isLeader(this.instanceId)];
                    case 1:
                        if (!_a.sent()) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.store.set(this.sessionId, key, value)];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3: return [4 /*yield*/, this.store.get(this.sessionId, key)];
                    case 4: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    SharedSessionState.prototype.setValues = function (keyValues) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.store.isLeader(this.instanceId)];
                    case 1:
                        if (!_a.sent()) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.store.setValues(this.sessionId, keyValues)];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3: return [4 /*yield*/, this.store.getValues(this.sessionId, Object.keys(keyValues))];
                    case 4: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    SharedSessionState.prototype.remove = function (key) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.store.remove(this.sessionId, key)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    SharedSessionState.prototype.increment = function (key, inc) {
        return __awaiter(this, void 0, void 0, function () {
            var value, valueToIncrement;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.get(key)];
                    case 1:
                        value = _a.sent();
                        return [4 /*yield*/, this.store.isLeader(this.instanceId)];
                    case 2:
                        if (!_a.sent()) return [3 /*break*/, 4];
                        valueToIncrement = inc === 0 ? 0 : inc ? inc : 1;
                        debug("[".concat(this.sessionId, "]: I am incrementing key ").concat(key, " with ").concat(valueToIncrement));
                        value += valueToIncrement;
                        return [4 /*yield*/, this.store.set(this.sessionId, key, value)];
                    case 3: return [2 /*return*/, _a.sent()];
                    case 4: return [2 /*return*/, value];
                }
            });
        });
    };
    return SharedSessionState;
}());
var SessionStateStore = /** @class */ (function (_super) {
    __extends(SessionStateStore, _super);
    function SessionStateStore(opts) {
        var _this = _super.call(this, "session", opts, {
            mediaSeq: 0,
            discSeq: 0,
            mediaSeqAudio: 0,
            discSeqAudio: 0,
            mediaSeqSubtitle: 0,
            discSeqSubtitle: 0,
            vodMediaSeqVideo: 0,
            vodMediaSeqAudio: 0,
            vodMediaSeqSubtitle: 0,
            state: SessionState.VOD_INIT,
            lastM3u8: {},
            tsLastRequestVideo: null,
            tsLastRequestMaster: null,
            tsLastRequestAudio: null,
            tsLastRequestSubtitle: null,
            currentVod: null,
            slateCount: 0,
            assetId: "",
            vodReloaded: 0,
        }) || this;
        if (opts && opts.cacheTTL) {
            _this.cacheTTL = opts.cacheTTL;
        }
        _this.cache = {
            leader: {
                ts: 0,
                value: null
            }
        };
        return _this;
    }
    SessionStateStore.prototype.ping = function (instanceId) {
        return __awaiter(this, void 0, void 0, function () {
            var t;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        t = Date.now();
                        return [4 /*yield*/, this.setVolatile("", instanceId, t)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    SessionStateStore.prototype.clearLeaderCache = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                debug("[".concat(this.instanceId, "]: clearing 'leader' cache"));
                this.cache.leader.value = null;
                return [2 /*return*/];
            });
        });
    };
    SessionStateStore.prototype.isLeader = function (instanceId) {
        return __awaiter(this, void 0, void 0, function () {
            var leader, lastSeen;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!instanceId) {
                            throw new Error("Cannot determine leader without instance id");
                        }
                        if (this.cache.leader.value && Date.now() < this.cache.leader.ts + this.cacheTTL) {
                            leader = this.cache.leader.value;
                            debug("[".concat(instanceId, "]: reading 'leader' from cache: I am").concat(leader === instanceId ? "" : " NOT", " the leader!"));
                            return [2 /*return*/, leader === instanceId];
                        }
                        return [4 /*yield*/, this.get("", "leader")];
                    case 1:
                        leader = _a.sent();
                        if (!!leader) return [3 /*break*/, 3];
                        leader = instanceId;
                        debug("[".concat(instanceId, "]: We have a new leader! ").concat(instanceId));
                        return [4 /*yield*/, this.set("", "leader", instanceId)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        if (!(leader !== instanceId)) return [3 /*break*/, 8];
                        debug("[".concat(instanceId, "]: Checking whether leader ").concat(leader, " is alive"));
                        return [4 /*yield*/, this.get("", leader)];
                    case 4:
                        lastSeen = _a.sent();
                        if (!!lastSeen) return [3 /*break*/, 6];
                        leader = instanceId;
                        debug("[".concat(instanceId, "]: Current leader is missing, taking the lead! ").concat(leader));
                        return [4 /*yield*/, this.set("", "leader", leader)];
                    case 5:
                        _a.sent();
                        return [3 /*break*/, 8];
                    case 6:
                        if (!(Date.now() - lastSeen > 30000)) return [3 /*break*/, 8];
                        leader = instanceId;
                        debug("[".concat(instanceId, "]: Current leader hasn't been seen for the last 30 sec, taking the lead! ").concat(leader));
                        return [4 /*yield*/, this.set("", "leader", leader)];
                    case 7:
                        _a.sent();
                        _a.label = 8;
                    case 8:
                        debug("[".concat(instanceId, "]: I am").concat(leader === instanceId ? "" : " NOT", " the leader!"));
                        this.cache.leader.ts = Date.now();
                        this.cache.leader.value = leader;
                        return [2 /*return*/, leader === instanceId];
                }
            });
        });
    };
    SessionStateStore.prototype.create = function (sessionId, instanceId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.init(sessionId)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, new SharedSessionState(this, sessionId, instanceId, { cacheTTL: this.cacheTTL || 5000 })];
                }
            });
        });
    };
    return SessionStateStore;
}(SharedStateStore));
module.exports = {
    SessionState: SessionState,
    SessionStateStore: SessionStateStore
};
