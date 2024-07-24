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
var _this = this;
var version = require("../package.json").version;
var fetch = require("node-fetch");
var AbortController = require("abort-controller").AbortController;
var filterQueryParser = function (filterQuery) {
    var conditions = filterQuery.match(/\(([^\(\)]*?)\)/g);
    var filter = {};
    if (!conditions) {
        return filter;
    }
    conditions.map(function (c) {
        var m = c.match(/\(type=="(.*?)"(AND|\|\|)(.*?)(<|>)(.*)\)/);
        if (m) {
            var type = m[1];
            var operator = m[2];
            var key = m[3];
            var comp = m[4];
            var value = m[5];
            if (!filter[type]) {
                filter[type] = {};
            }
            if (operator === "AND") {
                if (!filter[type][key]) {
                    filter[type][key] = {};
                }
                if (comp === "<") {
                    filter[type][key].high = parseInt(value, 10);
                }
                else if (comp === ">") {
                    filter[type][key].low = parseInt(value, 10);
                }
            }
        }
    });
    return filter;
};
var applyFilter = function (profiles, filter) {
    var filteredProfiles = {};
    var supportedFilterKeys = ["systemBitrate", "height"];
    if (!filter.video) {
        return profiles;
    }
    var keys = Object.keys(filter.video);
    if (supportedFilterKeys.every(function (supportedKey) { return !keys.includes(supportedKey); })) {
        return profiles;
    }
    if (filter.video.systemBitrate) {
        filteredProfiles = profiles.filter(function (profile) {
            if (filter.video.systemBitrate.low && filter.video.systemBitrate.high) {
                return profile.bw >= filter.video.systemBitrate.low && profile.bw <= filter.video.systemBitrate.high;
            }
            else if (filter.video.systemBitrate.low && !filter.video.systemBitrate.high) {
                return profile.bw >= filter.video.systemBitrate.low;
            }
            else if (!filter.video.systemBitrate.low && filter.video.systemBitrate.high) {
                return profile.bw <= filter.video.systemBitrate.high;
            }
            return true;
        });
    }
    if (filter.video.height) {
        var toFilter = profiles;
        if (!ItemIsEmpty(filteredProfiles)) {
            toFilter = filteredProfiles;
        }
        filteredProfiles = toFilter.filter(function (profile) {
            if (filter.video.height.low && filter.video.height.high) {
                return profile.resolution[1] >= filter.video.height.low && profile.resolution[1] <= filter.video.height.high;
            }
            else if (filter.video.height.low) {
                return profile.resolution[1] >= filter.video.height.low;
            }
            else if (filter.video.height.high) {
                return profile.resolution[1] <= filter.video.height.high;
            }
            return true;
        });
    }
    return filteredProfiles;
};
var ItemIsEmpty = function (obj) {
    if (!obj) {
        return true;
    }
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            return false;
        }
    }
    return true;
};
var cloudWatchLog = function (silent, type, logEntry) {
    if (!silent) {
        logEntry.type = type;
        logEntry.time = new Date().toISOString();
        console.log(JSON.stringify(logEntry));
    }
};
var m3u8Header = function (instanceId) {
    var m3u8 = "";
    m3u8 += "## Created with Eyevinn Channel Engine library (version=".concat(version).concat(instanceId ? "<" + instanceId + ">" : "", ")\n");
    m3u8 += "##    https://www.npmjs.com/package/eyevinn-channel-engine\n";
    return m3u8;
};
var toHHMMSS = function (secs) {
    var sec_num = parseInt(secs, 10);
    var hours = Math.floor(sec_num / 3600);
    var minutes = Math.floor(sec_num / 60) % 60;
    var seconds = sec_num % 60;
    return [hours, minutes, seconds].map(function (v) { return (v < 10 ? "0" + v : v); }).join(":");
};
var logerror = function (sessionId, err) {
    console.error("ERROR [".concat(sessionId, "]:"));
    console.error(err);
};
var timer = function (ms) { return new Promise(function (res) { return setTimeout(res, ms); }); };
var WaitTimeGenerator = /** @class */ (function () {
    function WaitTimeGenerator(defaultIntervalMs, minValue) {
        (this.timestamp = null), (this.prevWaitTime = null), (this.defaultIntervalMs = defaultIntervalMs || 3000), (this.minValue = minValue);
    }
    WaitTimeGenerator.prototype._getWaitTimeFromTimestamp = function () {
        if (!this.timestamp) {
            this.timestamp = new Date();
        }
        var sec = this.timestamp.getSeconds();
        var defaultSec = this.defaultIntervalMs / 1000;
        var d = parseInt(sec / defaultSec);
        var waitSec = defaultSec * (d + 1) - sec;
        return waitSec * 1000;
    };
    WaitTimeGenerator.prototype.getWaitTime = function (plannedTime) {
        return __awaiter(this, void 0, void 0, function () {
            var waitMs;
            return __generator(this, function (_a) {
                if (!this.timestamp || (this.prevWaitTime === this.minValue && plannedTime !== this.minValue)) {
                    this.timestamp = new Date();
                    waitMs = this._getWaitTimeFromTimestamp();
                    this.prevWaitTime = waitMs;
                    return [2 /*return*/, waitMs];
                }
                this.prevWaitTime = plannedTime;
                return [2 /*return*/, plannedTime];
            });
        });
    };
    return WaitTimeGenerator;
}());
var findNearestValue = function (val, array) {
    var sorted = array.sort(function (a, b) { return b - a; });
    return sorted.reduce(function (a, b) {
        return Math.abs(b - val) < Math.abs(a - val) ? b : a;
    });
};
var isValidUrl = function (url) {
    try {
        var _url = new URL(url);
        return true;
    }
    catch (err) {
        return false;
    }
};
var fetchWithRetry = function (uri, opts, maxRetries, retryDelayMs, timeoutMs, debug) { var debug; return __awaiter(_this, void 0, void 0, function () {
    var tryFetchCount, RETRY_LIMIT, TIMEOUT_LIMIT, RETRY_DELAY, _loop_1, state_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!debug) {
                    debug = function (msg) { console.log(msg); };
                }
                tryFetchCount = 0;
                RETRY_LIMIT = maxRetries || 5;
                TIMEOUT_LIMIT = timeoutMs || 10 * 1000;
                RETRY_DELAY = retryDelayMs || 1000;
                _loop_1 = function () {
                    var controller, timeout, fetchOpts, response, msg, err_1;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                tryFetchCount++;
                                debug("Fetching URI -> ".concat(uri, ", attempt ").concat(tryFetchCount, " of ").concat(maxRetries));
                                controller = new AbortController();
                                timeout = setTimeout(function () {
                                    "Request Timeout after (".concat(TIMEOUT_LIMIT, ")ms @ ").concat(uri);
                                    controller.abort();
                                }, TIMEOUT_LIMIT);
                                _b.label = 1;
                            case 1:
                                _b.trys.push([1, 5, 6, 7]);
                                fetchOpts = Object.assign({ signal: controller.signal }, opts);
                                return [4 /*yield*/, fetch(uri, fetchOpts)];
                            case 2:
                                response = _b.sent();
                                if (!(response.status >= 400 && response.status < 600)) return [3 /*break*/, 4];
                                msg = "Bad response from URI: ".concat(uri, "\nReturned Status Code: ").concat(response.status);
                                debug(msg);
                                if (tryFetchCount === maxRetries) {
                                    return [2 /*return*/, { value: Promise.resolve(response) }];
                                }
                                debug("Going to try fetch again in ".concat(RETRY_DELAY, "ms"));
                                return [4 /*yield*/, timer(RETRY_DELAY)];
                            case 3:
                                _b.sent();
                                return [2 /*return*/, "continue"];
                            case 4: return [2 /*return*/, { value: Promise.resolve(response) }];
                            case 5:
                                err_1 = _b.sent();
                                debug("Node-Fetch Error on URI: ".concat(uri, "\nFull Error -> ").concat(err_1));
                                if (tryFetchCount === maxRetries) {
                                    return [2 /*return*/, { value: Promise.reject(err_1) }];
                                }
                                return [2 /*return*/, "continue"];
                            case 6:
                                clearTimeout(timeout);
                                return [7 /*endfinally*/];
                            case 7: return [2 /*return*/];
                        }
                    });
                };
                _a.label = 1;
            case 1:
                if (!(tryFetchCount < RETRY_LIMIT)) return [3 /*break*/, 3];
                return [5 /*yield**/, _loop_1()];
            case 2:
                state_1 = _a.sent();
                if (typeof state_1 === "object")
                    return [2 /*return*/, state_1.value];
                return [3 /*break*/, 1];
            case 3: return [2 /*return*/];
        }
    });
}); };
var codecsFromString = function (codecs) {
    var audioCodecs = codecs.split(",").find(function (c) {
        return c.match(/^mp4a/) || c.match(/^ac-3/) || c.match(/^ec-3/);
    });
    var videoCodecs = codecs.split(",").find(function (c) {
        return c.match(/^avc/) || c.match(/^hevc/) || c.match(/^dvh/);
    });
    return [videoCodecs, audioCodecs];
};
var timeLeft = function (endTimestamp, currentTimestamp) {
    var secondsLeft = Math.floor((endTimestamp - currentTimestamp) / 1000);
    if (secondsLeft < 0) {
        return "Time has already passed.";
    }
    var hours = Math.floor(secondsLeft / 3600);
    var minutes = Math.floor((secondsLeft % 3600) / 60);
    var seconds = secondsLeft % 60;
    var msg = "";
    if (hours) {
        msg = "".concat(hours, "h").concat(minutes, "m").concat(seconds, "s");
    }
    else if (minutes) {
        msg = "".concat(minutes, "m").concat(seconds, "s");
    }
    else {
        msg = "".concat(seconds, "s");
    }
    return msg;
};
module.exports = {
    filterQueryParser: filterQueryParser,
    applyFilter: applyFilter,
    cloudWatchLog: cloudWatchLog,
    m3u8Header: m3u8Header,
    toHHMMSS: toHHMMSS,
    logerror: logerror,
    timer: timer,
    WaitTimeGenerator: WaitTimeGenerator,
    findNearestValue: findNearestValue,
    isValidUrl: isValidUrl,
    fetchWithRetry: fetchWithRetry,
    codecsFromString: codecsFromString,
    timeLeft: timeLeft,
};
