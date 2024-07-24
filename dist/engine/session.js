var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var crypto = require('crypto');
var debug = require('debug')('engine-session');
var HLSVod = require('@eyevinn/hls-vodtolive');
var m3u8 = require('@eyevinn/m3u8');
var HLSRepeatVod = require('@eyevinn/hls-repeat');
var HLSTruncateVod = require('@eyevinn/hls-truncate');
var Readable = require('stream').Readable;
var SessionState = require('./session_state.js').SessionState;
var PlayheadState = require('./playhead_state.js').PlayheadState;
var _a = require('./util.js'), applyFilter = _a.applyFilter, cloudWatchLog = _a.cloudWatchLog, m3u8Header = _a.m3u8Header, logerror = _a.logerror, codecsFromString = _a.codecsFromString;
var ChaosMonkey = require('./chaos_monkey.js');
var EVENT_LIST_LIMIT = 100;
var AVERAGE_SEGMENT_DURATION = 3000;
var DEFAULT_PLAYHEAD_DIFF_THRESHOLD = 1000;
var DEFAULT_MAX_TICK_INTERVAL = 10000;
var DEFAULT_DIFF_COMPENSATION_RATE = 0.5;
var timer = function (ms) { return new Promise(function (res) { return setTimeout(res, ms); }); };
var Session = /** @class */ (function () {
    /**
     *
     * config: {
     *   startWithId,
     * }
     *
     */
    function Session(assetManager, config, sessionStore) {
        this._assetManager = assetManager;
        this._sessionId = crypto.randomBytes(20).toString('hex');
        this._sessionStateStore = sessionStore.sessionStateStore;
        this._playheadStateStore = sessionStore.playheadStateStore;
        this._instanceId = sessionStore.instanceId;
        //this.currentVod;
        this.currentMetadata = {};
        this._events = [];
        this.averageSegmentDuration = AVERAGE_SEGMENT_DURATION;
        this.use_demuxed_audio = false;
        this.use_vtt_subtitles = false;
        this.dummySubtitleEndpoint = "";
        this.subtitleSliceEndpoint = "";
        this.cloudWatchLogging = false;
        this.playheadDiffThreshold = DEFAULT_PLAYHEAD_DIFF_THRESHOLD;
        this.maxTickInterval = DEFAULT_MAX_TICK_INTERVAL;
        this.maxTickIntervalIsDefault = true;
        this.diffCompensationRate = DEFAULT_DIFF_COMPENSATION_RATE;
        this.diffCompensation = null;
        this.timePositionOffset = 0;
        this.prevVodMediaSeq = {
            video: null,
            audio: null,
            subtitle: null
        };
        this.prevMediaSeqOffset = {
            video: null,
            audio: null,
            subtitle: null
        };
        this.waitingForNextVod = false;
        this.leaderIsSettingNextVod = false;
        this.isSwitchingBackToV2L = false;
        this.switchDataForSession = {
            mediaSeq: null,
            discSeq: null,
            mediaSeqOffset: null,
            transitionSegments: null,
            reloadBehind: null,
        };
        this.isAllowedToClearVodCache = null;
        this.alwaysNewSegments = null;
        this.alwaysMapBandwidthByNearest = null;
        this.partialStoreHLSVod = null;
        this.currentPlayheadRef = null;
        if (config) {
            if (config.alwaysNewSegments) {
                this.alwaysNewSegments = config.alwaysNewSegments;
            }
            if (config.partialStoreHLSVod) {
                this.partialStoreHLSVod = config.partialStoreHLSVod;
            }
            if (config.alwaysMapBandwidthByNearest) {
                this.alwaysMapBandwidthByNearest = config.alwaysMapBandwidthByNearest;
            }
            if (config.sessionId) {
                this._sessionId = config.sessionId;
            }
            if (config.category) {
                this._category = config.category;
            }
            if (config.averageSegmentDuration) {
                this.averageSegmentDuration = config.averageSegmentDuration;
            }
            if (config.useDemuxedAudio) {
                this.use_demuxed_audio = true;
            }
            if (config.dummySubtitleEndpoint) {
                this.dummySubtitleEndpoint = config.dummySubtitleEndpoint;
            }
            if (config.subtitleSliceEndpoint) {
                this.subtitleSliceEndpoint = config.subtitleSliceEndpoint;
            }
            if (config.useVTTSubtitles) {
                this.use_vtt_subtitles = config.useVTTSubtitles;
            }
            if (config.startWithId) {
                this.startWithId = config.startWithId;
            }
            if (config.profile) {
                this._sessionProfile = config.profile;
            }
            if (config.audioTracks) {
                this._audioTracks = config.audioTracks;
            }
            if (config.subtitleTracks) {
                this._subtitleTracks = config.subtitleTracks;
            }
            if (config.closedCaptions) {
                this._closedCaptions = config.closedCaptions;
            }
            if (config.noSessionDataTags) {
                this._noSessionDataTags = config.noSessionDataTags;
            }
            if (config.sessionEventStream) {
                this._sessionEventStream = config.sessionEventStream;
            }
            if (config.slateUri) {
                this.slateUri = config.slateUri;
                this.slateRepetitions = config.slateRepetitions || 10;
                this.slateDuration = config.slateDuration || 4000;
                debug("Will use slate URI ".concat(this.slateUri, " (").concat(this.slateRepetitions, " ").concat(this.slateDuration, "ms)"));
            }
            if (config.cloudWatchMetrics) {
                this.cloudWatchLogging = true;
            }
            if (config.playheadDiffThreshold) {
                this.playheadDiffThreshold = config.playheadDiffThreshold;
            }
            if (config.maxTickInterval) {
                this.maxTickInterval = config.maxTickInterval;
                this.maxTickIntervalIsDefault = false;
            }
            if (config.disabledPlayhead) {
                this.disabledPlayhead = true;
            }
            if (config.targetDurationPadding) {
                this.targetDurationPadding = config.targetDurationPadding;
            }
            if (config.forceTargetDuration) {
                this.forceTargetDuration = config.forceTargetDuration;
            }
            if (config.diffCompensationRate) {
                this.diffCompensationRate = config.diffCompensationRate;
            }
        }
    }
    Session.prototype.initAsync = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = this;
                        return [4 /*yield*/, this._sessionStateStore.create(this._sessionId, this._instanceId)];
                    case 1:
                        _a._sessionState = _c.sent();
                        _b = this;
                        return [4 /*yield*/, this._playheadStateStore.create(this._sessionId)];
                    case 2:
                        _b._playheadState = _c.sent();
                        if (!this.startWithId) return [3 /*break*/, 5];
                        return [4 /*yield*/, this._sessionState.set("state", SessionState.VOD_INIT_BY_ID)];
                    case 3:
                        _c.sent();
                        return [4 /*yield*/, this._sessionState.set("assetId", this.startWithId)];
                    case 4:
                        _c.sent();
                        _c.label = 5;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    Object.defineProperty(Session.prototype, "sessionId", {
        get: function () {
            return this._sessionId;
        },
        enumerable: false,
        configurable: true
    });
    Session.prototype.startPlayheadAsync = function () {
        return __awaiter(this, void 0, void 0, function () {
            var playheadState, state, numberOfLargeTicks, audioIncrement, tsIncrementBegin, manifest, tsIncrementEnd, sessionState, isLeader, firstDuration, tickInterval, reqTickInterval, timeSpentInIncrement, tickInterval, delta, position, timePosition, diff, timeToAdd, timeToAdd, DIFF_COMPENSATION, changeMaxTick, tsTickEnd, lastDuration, nextTickInterval, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        debug("[".concat(this._sessionId, "]: Playhead consumer started:"));
                        debug("[".concat(this._sessionId, "]: diffThreshold=").concat(this.playheadDiffThreshold));
                        debug("[".concat(this._sessionId, "]: maxTickInterval=").concat(this.maxTickInterval));
                        debug("[".concat(this._sessionId, "]: averageSegmentDuration=").concat(this.averageSegmentDuration));
                        this.disabledPlayhead = false;
                        return [4 /*yield*/, this._playheadState.getValues(["state"])];
                    case 1:
                        playheadState = _a.sent();
                        return [4 /*yield*/, this._playheadState.setState(PlayheadState.RUNNING)];
                    case 2:
                        state = _a.sent();
                        numberOfLargeTicks = 0;
                        audioIncrement = 1;
                        _a.label = 3;
                    case 3:
                        if (!(state !== PlayheadState.CRASHED)) return [3 /*break*/, 25];
                        _a.label = 4;
                    case 4:
                        _a.trys.push([4, 22, , 24]);
                        tsIncrementBegin = Date.now();
                        return [4 /*yield*/, this.incrementAsync()];
                    case 5:
                        manifest = _a.sent();
                        if (!!manifest) return [3 /*break*/, 7];
                        debug("[".concat(this._sessionId, "]: No manifest available yet, will try again after 1000ms"));
                        return [4 /*yield*/, timer(1000)];
                    case 6:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 7:
                        tsIncrementEnd = Date.now();
                        return [4 /*yield*/, this._sessionState.getValues(["state"])];
                    case 8:
                        sessionState = _a.sent();
                        return [4 /*yield*/, this._playheadState.getValues(["tickInterval", "playheadRef", "tickMs"])];
                    case 9:
                        playheadState = _a.sent();
                        return [4 /*yield*/, this._playheadState.getState()];
                    case 10:
                        state = _a.sent();
                        return [4 /*yield*/, this._sessionStateStore.isLeader(this._instanceId)];
                    case 11:
                        isLeader = _a.sent();
                        if (!(isLeader &&
                            [
                                SessionState.VOD_NEXT_INIT,
                                SessionState.VOD_NEXT_INITIATING,
                                SessionState.VOD_RELOAD_INIT,
                                SessionState.VOD_RELOAD_INITIATING
                            ].indexOf(sessionState.state) !== -1)) return [3 /*break*/, 13];
                        return [4 /*yield*/, this._getFirstDuration(manifest)];
                    case 12:
                        firstDuration = _a.sent();
                        tickInterval = firstDuration < 2 ? 2 : firstDuration;
                        debug("[".concat(this._sessionId, "]: I am the leader and updated tick interval to ").concat(tickInterval, " sec"));
                        cloudWatchLog(!this.cloudWatchLogging, 'engine-session', { event: 'tickIntervalUpdated', channel: this._sessionId, tickIntervalSec: tickInterval });
                        this._playheadState.set("tickInterval", tickInterval, isLeader);
                        return [3 /*break*/, 21];
                    case 13:
                        if (!(state == PlayheadState.STOPPED)) return [3 /*break*/, 14];
                        debug("[".concat(this._sessionId, "]: Stopping playhead"));
                        return [2 /*return*/];
                    case 14:
                        reqTickInterval = playheadState.tickInterval;
                        timeSpentInIncrement = (tsIncrementEnd - tsIncrementBegin) / 1000;
                        tickInterval = reqTickInterval - timeSpentInIncrement;
                        return [4 /*yield*/, this._getCurrentDeltaTime()];
                    case 15:
                        delta = _a.sent();
                        if (delta != 0) {
                            tickInterval += delta;
                            debug("[".concat(this._sessionId, "]: Delta time is != 0 need will adjust ").concat(delta, "sec to tick interval. tick=").concat(tickInterval));
                        }
                        return [4 /*yield*/, this._getCurrentPlayheadPosition()];
                    case 16:
                        position = (_a.sent()) * 1000;
                        timePosition = Date.now() - playheadState.playheadRef;
                        // Apply time position offset if set, only after external diff compensation has concluded.
                        if (this.timePositionOffset && this.diffCompensation <= 0 && this.alwaysNewSegments) {
                            timePosition -= this.timePositionOffset;
                            cloudWatchLog(!this.cloudWatchLogging, 'engine-session', { event: 'applyTimePositionOffset', channel: this._sessionId, offsetMs: this.timePositionOffset });
                        }
                        diff = position - timePosition;
                        debug("[".concat(this._sessionId, "]: ").concat(timePosition, ":").concat(position, ":").concat(diff > 0 ? '+' : '').concat(diff, "ms"));
                        cloudWatchLog(!this.cloudWatchLogging, 'engine-session', { event: 'playheadDiff', channel: this._sessionId, diffMs: diff });
                        if (this.alwaysNewSegments) {
                            // Apply Playhead diff compensation, only after external diff compensation has concluded.
                            if (this.diffCompensation <= 0) {
                                timeToAdd = this._getPlayheadDiffCompensationValue(diff, this.playheadDiffThreshold);
                                tickInterval += timeToAdd;
                            }
                        }
                        else {
                            timeToAdd = this._getPlayheadDiffCompensationValue(diff, this.playheadDiffThreshold);
                            tickInterval += timeToAdd;
                        }
                        // Apply external diff compensation if available.
                        if (this.diffCompensation && this.diffCompensation > 0) {
                            DIFF_COMPENSATION = (reqTickInterval * this.diffCompensationRate).toFixed(2) * 1000;
                            debug("[".concat(this._sessionId, "]: Adding ").concat(DIFF_COMPENSATION, "msec to tickInterval to compensate for schedule diff (current=").concat(this.diffCompensation, "msec)"));
                            tickInterval += (DIFF_COMPENSATION / 1000);
                            this.diffCompensation -= DIFF_COMPENSATION;
                        }
                        // Keep tickInterval within upper and lower limits.
                        debug("[".concat(this._sessionId, "]: Requested tickInterval=").concat(tickInterval, "s (max=").concat(this.maxTickInterval / 1000, "s, diffThreshold=").concat(this.playheadDiffThreshold, "msec)"));
                        if (tickInterval <= 0.5) {
                            tickInterval = 0.5;
                        }
                        else if (tickInterval > (this.maxTickInterval / 1000)) {
                            changeMaxTick = Math.ceil(Math.abs(tickInterval * 1000 - (this.maxTickInterval))) + 1000;
                            if (this.maxTickIntervalIsDefault) {
                                if (numberOfLargeTicks > 2) {
                                    this.maxTickInterval += changeMaxTick;
                                    numberOfLargeTicks = 0;
                                }
                                else {
                                    numberOfLargeTicks++;
                                }
                            }
                            else {
                                console.warn("[".concat(this._sessionId, "]: Playhead tick interval went over Max tick interval by ").concat(changeMaxTick, "ms.\n              If the value keeps increasing, consider increasing the 'maxTickInterval' in engineOptions"));
                            }
                            tickInterval = this.maxTickInterval / 1000;
                        }
                        debug("[".concat(this._sessionId, "]: (").concat((new Date()).toISOString(), ") ").concat(timeSpentInIncrement, "sec in increment. Next tick in ").concat(tickInterval, " seconds"));
                        return [4 /*yield*/, timer((tickInterval * 1000) - 50)];
                    case 17:
                        _a.sent();
                        tsTickEnd = Date.now();
                        return [4 /*yield*/, this._playheadState.set("tickMs", (tsTickEnd - tsIncrementBegin), isLeader)];
                    case 18:
                        _a.sent();
                        cloudWatchLog(!this.cloudWatchLogging, 'engine-session', { event: 'tickInterval', channel: this._sessionId, tickTimeMs: (tsTickEnd - tsIncrementBegin) });
                        if (!this.alwaysNewSegments) return [3 /*break*/, 21];
                        return [4 /*yield*/, this._getLastDuration(manifest)];
                    case 19:
                        lastDuration = _a.sent();
                        nextTickInterval = lastDuration < 2 ? 2 : lastDuration;
                        return [4 /*yield*/, this._playheadState.set("tickInterval", nextTickInterval, isLeader)];
                    case 20:
                        _a.sent();
                        cloudWatchLog(!this.cloudWatchLogging, "engine-session", { event: "tickIntervalUpdated", channel: this._sessionId, tickIntervalSec: nextTickInterval });
                        _a.label = 21;
                    case 21: return [3 /*break*/, 24];
                    case 22:
                        err_1 = _a.sent();
                        debug("[".concat(this._sessionId, "]: Playhead consumer crashed (1)"));
                        console.error("[".concat(this._sessionId, "]: ").concat(err_1.message));
                        cloudWatchLog(!this.cloudWatchLogging, 'engine-session', { event: 'error', on: 'playhead', channel: this._sessionId, err: err_1 });
                        debug(err_1);
                        return [4 /*yield*/, this._playheadState.setState(PlayheadState.CRASHED)];
                    case 23:
                        state = _a.sent();
                        return [3 /*break*/, 24];
                    case 24: return [3 /*break*/, 3];
                    case 25: return [2 /*return*/];
                }
            });
        });
    };
    Session.prototype.restartPlayheadAsync = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._sessionState.set("state", SessionState.VOD_NEXT_INIT)];
                    case 1:
                        _a.sent();
                        debug("[".concat(this._sessionId, "]: Restarting playhead consumer"));
                        return [4 /*yield*/, this.startPlayheadAsync()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Session.prototype.stopPlayheadAsync = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        debug("[".concat(this._sessionId, "]: Stopping playhead consumer"));
                        return [4 /*yield*/, this._playheadState.setState(PlayheadState.STOPPED)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Session.prototype.getStatusAsync = function () {
        return __awaiter(this, void 0, void 0, function () {
            var playheadState, state, sessionState, playheadStateMap, status_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.disabledPlayhead) return [3 /*break*/, 1];
                        return [2 /*return*/, {
                                sessionId: this._sessionId,
                            }];
                    case 1: return [4 /*yield*/, this._playheadState.getValues(["tickMs", "mediaSeq", "vodMediaSeqVideo"])];
                    case 2:
                        playheadState = _a.sent();
                        return [4 /*yield*/, this._playheadState.getState()];
                    case 3:
                        state = _a.sent();
                        return [4 /*yield*/, this._sessionState.getValues(["slateCount"])];
                    case 4:
                        sessionState = _a.sent();
                        playheadStateMap = {};
                        playheadStateMap[PlayheadState.IDLE] = 'idle';
                        playheadStateMap[PlayheadState.RUNNING] = 'running';
                        playheadStateMap[PlayheadState.CRASHED] = 'crashed';
                        playheadStateMap[PlayheadState.STOPPED] = 'stopped';
                        status_1 = {
                            sessionId: this._sessionId,
                            playhead: {
                                state: playheadStateMap[state],
                                tickMs: playheadState.tickMs,
                                mediaSeq: playheadState.mediaSeq + playheadState.vodMediaSeqVideo,
                            },
                            slateInserted: sessionState.slateCount,
                        };
                        return [2 /*return*/, status_1];
                }
            });
        });
    };
    Session.prototype.resetAsync = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!id) return [3 /*break*/, 3];
                        return [4 /*yield*/, this._sessionStateStore.reset(id)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this._playheadStateStore.reset(id)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [4 /*yield*/, this._sessionStateStore.resetAll()];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, this._playheadStateStore.resetAll()];
                    case 5:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Session.prototype.getSessionState = function () {
        return __awaiter(this, void 0, void 0, function () {
            var state;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._sessionState.get("state")];
                    case 1:
                        state = _a.sent();
                        return [2 /*return*/, state];
                }
            });
        });
    };
    Session.prototype.getTruncatedVodSegments = function (vodUri, duration) {
        return __awaiter(this, void 0, void 0, function () {
            var hlsVod, vodSegments_1, exc_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this._truncateSlate(null, duration, vodUri)];
                    case 1:
                        hlsVod = _a.sent();
                        vodSegments_1 = hlsVod.getMediaSegments();
                        Object.keys(vodSegments_1).forEach(function (bw) { return vodSegments_1[bw].unshift({ discontinuity: true, cue: { in: true } }); });
                        return [2 /*return*/, vodSegments_1];
                    case 2:
                        exc_1 = _a.sent();
                        debug("[".concat(this._sessionId, "]: Failed to generate truncated VOD!"));
                        return [2 /*return*/, null];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    Session.prototype.getTruncatedVodSegmentsWithOptions = function (vodUri, duration, options) {
        return __awaiter(this, void 0, void 0, function () {
            var hlsVod, vodSegments_2, exc_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this._truncateSlateWithOptions(null, duration, vodUri, options)];
                    case 1:
                        hlsVod = _a.sent();
                        vodSegments_2 = hlsVod.getMediaSegments();
                        Object.keys(vodSegments_2).forEach(function (bw) { return vodSegments_2[bw].unshift({ discontinuity: true, cue: { in: true } }); });
                        return [2 /*return*/, vodSegments_2];
                    case 2:
                        exc_2 = _a.sent();
                        debug("[".concat(this._sessionId, "]: Failed to generate truncated VOD!"));
                        return [2 /*return*/, null];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    Session.prototype.setCurrentMediaSequenceSegments = function (segments, mSeqOffset, reloadBehind) {
        return __awaiter(this, void 0, void 0, function () {
            var waitTimeMs, i, isLeader, vodReloaded, attempts, vodReloaded, attempts;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this._sessionState) {
                            throw new Error("Session not ready");
                        }
                        this.isSwitchingBackToV2L = true;
                        this.switchDataForSession.reloadBehind = reloadBehind;
                        this.switchDataForSession.transitionSegments = segments;
                        this.switchDataForSession.mediaSeqOffset = mSeqOffset;
                        waitTimeMs = 2000;
                        for (i = segments[Object.keys(segments)[0]].length - 1; 0 < i; i--) {
                            if (segments[Object.keys(segments)[0]][i].duration) {
                                waitTimeMs = parseInt(1000 * (segments[Object.keys(segments)[0]][i].duration / 3), 10);
                                break;
                            }
                        }
                        return [4 /*yield*/, this._sessionStateStore.isLeader(this._instanceId)];
                    case 1:
                        isLeader = _a.sent();
                        if (!!isLeader) return [3 /*break*/, 13];
                        debug("[".concat(this._sessionId, "]: FOLLOWER: Invalidate cache to ensure having the correct VOD!"));
                        return [4 /*yield*/, this._sessionState.clearCurrentVodCache()];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, this._sessionState.get("vodReloaded")];
                    case 3:
                        vodReloaded = _a.sent();
                        attempts = 9;
                        _a.label = 4;
                    case 4:
                        if (!(!isLeader && !vodReloaded && attempts > 0)) return [3 /*break*/, 9];
                        debug("[".concat(this._sessionId, "]: FOLLOWER: I arrived before LEADER. Waiting (1000ms) for LEADER to reload currentVod in store! (tries left=").concat(attempts, ")"));
                        return [4 /*yield*/, timer(1000)];
                    case 5:
                        _a.sent();
                        return [4 /*yield*/, this._sessionStateStore.clearLeaderCache()];
                    case 6:
                        _a.sent();
                        return [4 /*yield*/, this._sessionStateStore.isLeader(this._instanceId)];
                    case 7:
                        isLeader = _a.sent();
                        return [4 /*yield*/, this._sessionState.get("vodReloaded")];
                    case 8:
                        vodReloaded = _a.sent();
                        attempts--;
                        return [3 /*break*/, 4];
                    case 9:
                        if (attempts === 0) {
                            debug("[".concat(this._sessionId, "]: FOLLOWER: WARNING! Attempts=0 - Risk of using wrong currentVod"));
                        }
                        if (!(!isLeader || vodReloaded)) return [3 /*break*/, 11];
                        debug("[".concat(this._sessionId, "]: FOLLOWER: leader is alive, and has presumably updated currentVod. Clearing the cache now"));
                        return [4 /*yield*/, this._sessionState.clearCurrentVodCache()];
                    case 10:
                        _a.sent();
                        return [2 /*return*/];
                    case 11:
                        debug("[".concat(this._sessionId, "]: NEW LEADER: Setting state=VOD_RELOAD_INIT"));
                        this.isSwitchingBackToV2L = true;
                        return [4 /*yield*/, this._sessionState.set("state", SessionState.VOD_RELOAD_INIT)];
                    case 12:
                        _a.sent();
                        return [3 /*break*/, 19];
                    case 13: return [4 /*yield*/, this._sessionState.get("vodReloaded")];
                    case 14:
                        vodReloaded = _a.sent();
                        attempts = 12;
                        _a.label = 15;
                    case 15:
                        if (!(!vodReloaded && attempts > 0)) return [3 /*break*/, 18];
                        debug("[".concat(this._sessionId, "]: LEADER: Waiting (").concat(waitTimeMs, "ms) to buy some time reloading vod and adding it to store! (tries left=").concat(attempts, ")"));
                        return [4 /*yield*/, timer(waitTimeMs)];
                    case 16:
                        _a.sent();
                        return [4 /*yield*/, this._sessionState.get("vodReloaded")];
                    case 17:
                        vodReloaded = _a.sent();
                        attempts--;
                        return [3 /*break*/, 15];
                    case 18:
                        if (attempts === 0) {
                            debug("[".concat(this._sessionId, "]: LEADER: WARNING! Vod was never Reloaded!"));
                            return [2 /*return*/];
                        }
                        _a.label = 19;
                    case 19: return [2 /*return*/];
                }
            });
        });
    };
    Session.prototype.getCurrentMediaSequenceSegments = function (opts) {
        return __awaiter(this, void 0, void 0, function () {
            var isLeader, state, tries, waitTimeMs, playheadState, _a, currentVod, mediaSegments, mediaSequenceValue, err_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this._sessionState) {
                            throw new Error('Session not ready');
                        }
                        return [4 /*yield*/, this._sessionStateStore.isLeader(this._instanceId)];
                    case 1:
                        isLeader = _b.sent();
                        if (!isLeader) return [3 /*break*/, 3];
                        return [4 /*yield*/, this._sessionState.set("vodReloaded", 0)];
                    case 2:
                        _b.sent();
                        _b.label = 3;
                    case 3: return [4 /*yield*/, this.getSessionState()];
                    case 4:
                        state = _b.sent();
                        tries = 12;
                        _b.label = 5;
                    case 5:
                        if (!(state !== SessionState.VOD_PLAYING && tries > 0)) return [3 /*break*/, 8];
                        waitTimeMs = 500;
                        debug("[".concat(this._sessionId, "]: state=").concat(state, " - Waiting ").concat(waitTimeMs, "ms_").concat(tries, " until Leader has finished loading next vod."));
                        return [4 /*yield*/, timer(waitTimeMs)];
                    case 6:
                        _b.sent();
                        tries--;
                        return [4 /*yield*/, this.getSessionState()];
                    case 7:
                        state = _b.sent();
                        return [3 /*break*/, 5];
                    case 8:
                        playheadState = {
                            vodMediaSeqVideo: null
                        };
                        if (!(opts && opts.targetMseq !== undefined)) return [3 /*break*/, 9];
                        playheadState.vodMediaSeqVideo = opts.targetMseq;
                        return [3 /*break*/, 11];
                    case 9:
                        _a = playheadState;
                        return [4 /*yield*/, this._playheadState.get("vodMediaSeqVideo")];
                    case 10:
                        _a.vodMediaSeqVideo = _b.sent();
                        _b.label = 11;
                    case 11: return [4 /*yield*/, this._sessionState.getCurrentVod()];
                    case 12:
                        currentVod = _b.sent();
                        if (!currentVod) return [3 /*break*/, 17];
                        _b.label = 13;
                    case 13:
                        _b.trys.push([13, 14, , 16]);
                        mediaSegments = currentVod.getLiveMediaSequenceSegments(playheadState.vodMediaSeqVideo);
                        mediaSequenceValue = 0;
                        if (currentVod.sequenceAlwaysContainNewSegments) {
                            mediaSequenceValue = currentVod.mediaSequenceValues[playheadState.vodMediaSeqVideo];
                            debug("[".concat(this._sessionId, "]: {").concat(mediaSequenceValue, "}_{").concat(currentVod.getLastSequenceMediaSequenceValue(), "}"));
                        }
                        else {
                            mediaSequenceValue = playheadState.vodMediaSeqVideo;
                        }
                        debug("[".concat(this._sessionId, "]: Requesting all segments from Media Sequence: ").concat(playheadState.vodMediaSeqVideo, "(").concat(mediaSequenceValue, ")_").concat(currentVod.getLiveMediaSequencesCount()));
                        return [2 /*return*/, mediaSegments];
                    case 14:
                        err_2 = _b.sent();
                        logerror(this._sessionId, err_2);
                        return [4 /*yield*/, this._sessionState.clearCurrentVodCache()];
                    case 15:
                        _b.sent(); // force reading up from shared store
                        throw new Error("Failed to get all current Media segments: " + JSON.stringify(playheadState));
                    case 16: return [3 /*break*/, 18];
                    case 17: throw new Error("Engine not ready");
                    case 18: return [2 /*return*/];
                }
            });
        });
    };
    Session.prototype.setCurrentMediaAndDiscSequenceCount = function (_mediaSeq, _discSeq) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (!this._sessionState) {
                    throw new Error("Session not ready");
                }
                this.isSwitchingBackToV2L = true;
                this.switchDataForSession.mediaSeq = _mediaSeq;
                this.switchDataForSession.discSeq = _discSeq;
                return [2 /*return*/];
            });
        });
    };
    Session.prototype.getCurrentMediaAndDiscSequenceCount = function () {
        return __awaiter(this, void 0, void 0, function () {
            var state, tries, waitTimeMs, playheadState, discSeqOffset, isLeader, currentVod, mediaSequenceValue, discSeqCount, err_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this._sessionState) {
                            throw new Error('Session not ready');
                        }
                        return [4 /*yield*/, this.getSessionState()];
                    case 1:
                        state = _a.sent();
                        tries = 12;
                        _a.label = 2;
                    case 2:
                        if (!(state !== SessionState.VOD_PLAYING && tries > 0)) return [3 /*break*/, 5];
                        waitTimeMs = 500;
                        debug("[".concat(this._sessionId, "]: state=").concat(state, " - Waiting ").concat(waitTimeMs, "ms_").concat(tries, " until Leader has finished loading next vod."));
                        return [4 /*yield*/, timer(waitTimeMs)];
                    case 3:
                        _a.sent();
                        tries--;
                        return [4 /*yield*/, this.getSessionState()];
                    case 4:
                        state = _a.sent();
                        return [3 /*break*/, 2];
                    case 5: return [4 /*yield*/, this._playheadState.getValues(["mediaSeq", "vodMediaSeqVideo"])];
                    case 6:
                        playheadState = _a.sent();
                        return [4 /*yield*/, this._sessionState.get("discSeq")];
                    case 7:
                        discSeqOffset = _a.sent();
                        if (!(playheadState.vodMediaSeqVideo === 0)) return [3 /*break*/, 10];
                        return [4 /*yield*/, this._sessionStateStore.isLeader(this._instanceId)];
                    case 8:
                        isLeader = _a.sent();
                        if (!!isLeader) return [3 /*break*/, 10];
                        debug("[".concat(this._sessionId, "]: Not a leader, about to switch, and first media sequence in a VOD is requested. Invalidate cache to ensure having the correct VOD."));
                        return [4 /*yield*/, this._sessionState.clearCurrentVodCache()];
                    case 9:
                        _a.sent(); // force reading up from shared store
                        _a.label = 10;
                    case 10: return [4 /*yield*/, this._sessionState.getCurrentVod()];
                    case 11:
                        currentVod = _a.sent();
                        if (!currentVod) return [3 /*break*/, 16];
                        _a.label = 12;
                    case 12:
                        _a.trys.push([12, 13, , 15]);
                        mediaSequenceValue = 0;
                        if (currentVod.sequenceAlwaysContainNewSegments) {
                            mediaSequenceValue = currentVod.mediaSequenceValues[playheadState.vodMediaSeqVideo];
                            debug("[".concat(this._sessionId, "]: seqIndex=").concat(playheadState.vodMediaSeqVideo, "_seqValue=").concat(mediaSequenceValue));
                        }
                        else {
                            mediaSequenceValue = playheadState.vodMediaSeqVideo;
                        }
                        discSeqCount = discSeqOffset + currentVod.discontinuities[playheadState.vodMediaSeqVideo];
                        debug("[".concat(this._sessionId, "]: MediaSeq: (").concat(playheadState.mediaSeq, "+").concat(mediaSequenceValue, "=").concat((playheadState.mediaSeq + mediaSequenceValue), ") and DiscSeq: (").concat(discSeqCount, ") requested "));
                        return [2 /*return*/, {
                                'mediaSeq': (playheadState.mediaSeq + mediaSequenceValue),
                                'discSeq': discSeqCount,
                                'vodMediaSeqVideo': playheadState.vodMediaSeqVideo,
                            }];
                    case 13:
                        err_3 = _a.sent();
                        logerror(this._sessionId, err_3);
                        return [4 /*yield*/, this._sessionState.clearCurrentVodCache()];
                    case 14:
                        _a.sent(); // force reading up from shared store
                        throw new Error("Failed to get states: " + JSON.stringify(playheadState));
                    case 15: return [3 /*break*/, 17];
                    case 16: throw new Error("Engine not ready");
                    case 17: return [2 /*return*/];
                }
            });
        });
    };
    Session.prototype.getCurrentMediaManifestAsync = function (bw, playbackSessionId) {
        return __awaiter(this, void 0, void 0, function () {
            var m3u8;
            return __generator(this, function (_a) {
                if (!this._sessionState) {
                    throw new Error('Session not ready');
                }
                m3u8 = this._getM3u8File("video", bw, playbackSessionId);
                return [2 /*return*/, m3u8];
            });
        });
    };
    Session.prototype.getCurrentAudioManifestAsync = function (audioGroupId, audioLanguage, playbackSessionId) {
        return __awaiter(this, void 0, void 0, function () {
            var variantKey, m3u8;
            return __generator(this, function (_a) {
                if (!this._sessionState) {
                    throw new Error('Session not ready');
                }
                variantKey = JSON.stringify({ groupId: audioGroupId, lang: audioLanguage });
                m3u8 = this._getM3u8File("audio", variantKey, playbackSessionId);
                return [2 /*return*/, m3u8];
            });
        });
    };
    Session.prototype.getCurrentSubtitleManifestAsync = function (subtitleGroupId, subtitleLanguage, playbackSessionId) {
        return __awaiter(this, void 0, void 0, function () {
            var variantKey, m3u8;
            return __generator(this, function (_a) {
                if (!this._sessionState) {
                    throw new Error('Session not ready');
                }
                variantKey = JSON.stringify({ groupId: subtitleGroupId, lang: subtitleLanguage });
                m3u8 = this._getM3u8File("subtitle", variantKey, playbackSessionId);
                return [2 /*return*/, m3u8];
            });
        });
    };
    Session.prototype.incrementAsync = function () {
        return __awaiter(this, void 0, void 0, function () {
            var isLeader, sessionState, playheadState, currentVod, _a, isOldVod, nextState, leaderAction, leaderState, _b, m3u8_1, _c, playheadPosVideoMs, playheadAudio, playheadSubtitle, audioSeqLastIdx, sessionStateObj, _d, playheadPosVideo, _e, subtitleSeqLastIdx, sessionStateObj, _f, newSessionState, updatedValues, updatedPlayhead, mediaSequenceValue, audioInfo, mediaSequenceValueAudio, subsInfo, mediaSequenceValueSubtitle, diffMs, m3u8;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0: return [4 /*yield*/, this._tickAsync()];
                    case 1:
                        _g.sent();
                        return [4 /*yield*/, this._sessionStateStore.isLeader(this._instanceId)];
                    case 2:
                        isLeader = _g.sent();
                        return [4 /*yield*/, this._sessionState.getValues(["state", "mediaSeq", "mediaSeqAudio", "mediaSeqSubtitle", "discSeq", "discSeqAudio", "discSeqSubtitle", "vodMediaSeqVideo", "vodMediaSeqAudio", "vodMediaSeqSubtitle"])];
                    case 3:
                        sessionState = _g.sent();
                        return [4 /*yield*/, this._playheadState.getValues(["mediaSeq", "mediaSeqAudio", "mediaSeqSubtitle", "vodMediaSeqVideo", "vodMediaSeqAudio", "vodMediaSubtitle", "playheadRef"])];
                    case 4:
                        playheadState = _g.sent();
                        return [4 /*yield*/, this._sessionState.getCurrentVod()];
                    case 5:
                        currentVod = _g.sent();
                        if (!(!currentVod ||
                            sessionState.vodMediaSeqVideo === null ||
                            sessionState.vodMediaSeqAudio === null ||
                            sessionState.vodMediaSeqSubtitle === null ||
                            sessionState.state === null ||
                            sessionState.mediaSeq === null ||
                            sessionState.discSeq === null)) return [3 /*break*/, 9];
                        debug("[".concat(this._sessionId, "]: Session is not ready yet"));
                        debug(sessionState);
                        return [4 /*yield*/, this._sessionState.clearCurrentVodCache()];
                    case 6:
                        _g.sent();
                        if (!isLeader) return [3 /*break*/, 8];
                        debug("[".concat(this._sessionId, "]: I am the leader, trying to initiate the session"));
                        _a = sessionState;
                        return [4 /*yield*/, this._sessionState.set("state", SessionState.VOD_INIT)];
                    case 7:
                        _a.state = _g.sent();
                        _g.label = 8;
                    case 8: return [2 /*return*/, null];
                    case 9:
                        if (!(sessionState.state === SessionState.VOD_NEXT_INITIATING || sessionState.state === SessionState.VOD_RELOAD_INITIATING)) return [3 /*break*/, 14];
                        if (!isLeader) return [3 /*break*/, 11];
                        isOldVod = this._isOldVod(playheadState.playheadRef, currentVod.getDuration());
                        nextState = SessionState.VOD_PLAYING;
                        if (isOldVod) {
                            nextState = SessionState.VOD_NEXT_INIT;
                        }
                        leaderAction = sessionState.state === SessionState.VOD_NEXT_INITIATING ? "initiated" : "reloaded";
                        leaderState = nextState === SessionState.VOD_NEXT_INIT ? "VOD_NEXT_INIT" : "VOD_PLAYING";
                        debug("[".concat(this._sessionId, "]: I am the leader and have just ").concat(leaderAction, " next VOD, let's move to  ").concat(leaderState));
                        _b = sessionState;
                        return [4 /*yield*/, this._sessionState.set("state", nextState)];
                    case 10:
                        _b.state = _g.sent();
                        return [3 /*break*/, 13];
                    case 11:
                        debug("[".concat(this._sessionId, "]: Return the last generated m3u8 to give the leader some time"));
                        return [4 /*yield*/, this._playheadState.getLastM3u8()];
                    case 12:
                        m3u8_1 = _g.sent();
                        if (m3u8_1) {
                            return [2 /*return*/, m3u8_1];
                        }
                        else {
                            debug("[".concat(this._sessionId, "]: We don't have any previously generated m3u8"));
                        }
                        this.isAllowedToClearVodCache = true;
                        _g.label = 13;
                    case 13: return [3 /*break*/, 28];
                    case 14:
                        _c = sessionState;
                        return [4 /*yield*/, this._sessionState.increment("vodMediaSeqVideo", 1)];
                    case 15:
                        _c.vodMediaSeqVideo = _g.sent();
                        playheadPosVideoMs = void 0;
                        playheadAudio = void 0;
                        playheadSubtitle = void 0;
                        if (!(this.use_demuxed_audio || this.use_vtt_subtitles)) return [3 /*break*/, 17];
                        return [4 /*yield*/, this._getCurrentPlayheadPosition()];
                    case 16:
                        playheadPosVideoMs = (_g.sent()) * 1000;
                        _g.label = 17;
                    case 17:
                        if (!this.use_demuxed_audio) return [3 /*break*/, 21];
                        audioSeqLastIdx = currentVod.getLiveMediaSequencesCount("audio") - 1;
                        return [4 /*yield*/, this._sessionState.getValues(["vodMediaSeqAudio"])];
                    case 18:
                        sessionStateObj = _g.sent();
                        return [4 /*yield*/, this._determineExtraMediaIncrement("audio", playheadPosVideoMs, audioSeqLastIdx, sessionStateObj.vodMediaSeqAudio, this._getAudioPlayheadPosition.bind(this))];
                    case 19:
                        playheadAudio = _g.sent();
                        // Perform the Increment
                        debug("[".concat(this._sessionId, "]: Will increment audio with ").concat(playheadAudio.increment));
                        _d = sessionState;
                        return [4 /*yield*/, this._sessionState.increment("vodMediaSeqAudio", playheadAudio.increment)];
                    case 20:
                        _d.vodMediaSeqAudio = _g.sent();
                        _g.label = 21;
                    case 21:
                        if (!this.use_vtt_subtitles) return [3 /*break*/, 27];
                        _e = playheadPosVideo;
                        if (_e) return [3 /*break*/, 23];
                        return [4 /*yield*/, this._getCurrentPlayheadPosition()];
                    case 22:
                        _e = (_g.sent()) * 1000;
                        _g.label = 23;
                    case 23:
                        playheadPosVideo = _e;
                        subtitleSeqLastIdx = currentVod.getLiveMediaSequencesCount("subtitle") - 1;
                        return [4 /*yield*/, this._sessionState.getValues(["vodMediaSeqSubtitle"])];
                    case 24:
                        sessionStateObj = _g.sent();
                        return [4 /*yield*/, this._determineExtraMediaIncrement("subtitle", playheadPosVideoMs, subtitleSeqLastIdx, sessionStateObj.vodMediaSeqSubtitle, this._getSubtitlePlayheadPosition.bind(this))];
                    case 25:
                        playheadSubtitle = _g.sent();
                        // Perform the Increment
                        debug("[".concat(this._sessionId, "]: Will increment subtitle with ").concat(playheadSubtitle.increment));
                        _f = sessionState;
                        return [4 /*yield*/, this._sessionState.increment("vodMediaSeqSubtitle", playheadSubtitle.increment)];
                    case 26:
                        _f.vodMediaSeqSubtitle = _g.sent();
                        _g.label = 27;
                    case 27:
                        debug("[".concat(this._sessionId, "]: Current VOD Playhead Positions are to be V[").concat((playheadPosVideoMs / 1000).toFixed(3), "]").concat(playheadAudio ? "A[".concat((playheadAudio.position).toFixed(3), "]") : "").concat(playheadSubtitle ? "S[".concat((playheadSubtitle.position).toFixed(3), ")]") : "").concat(playheadAudio ? " (".concat(playheadAudio.diff, ")") : "").concat(playheadSubtitle ? " (".concat(playheadSubtitle.diff, ")") : ""));
                        _g.label = 28;
                    case 28:
                        newSessionState = {};
                        if (sessionState.vodMediaSeqVideo >= currentVod.getLiveMediaSequencesCount() - 1) {
                            newSessionState.vodMediaSeqVideo = currentVod.getLiveMediaSequencesCount() - 1;
                            newSessionState.state = SessionState.VOD_NEXT_INIT;
                        }
                        if (sessionState.vodMediaSeqAudio >= currentVod.getLiveMediaSequencesCount("audio") - 1) {
                            newSessionState.vodMediaSeqAudio = currentVod.getLiveMediaSequencesCount("audio") - 1;
                        }
                        if (sessionState.vodMediaSeqSubtitle >= currentVod.getLiveMediaSequencesCount("subtitle") - 1) {
                            newSessionState.vodMediaSeqSubtitle = currentVod.getLiveMediaSequencesCount("subtitle") - 1;
                        }
                        if (this.isSwitchingBackToV2L) {
                            newSessionState.state = SessionState.VOD_RELOAD_INIT;
                            this.isSwitchingBackToV2L = false;
                        }
                        return [4 /*yield*/, this._sessionState.setValues(newSessionState)];
                    case 29:
                        updatedValues = _g.sent();
                        sessionState = __assign(__assign({}, sessionState), updatedValues);
                        if (isLeader) {
                            debug("[".concat(this._sessionId, "]: I am the leader, updating PlayheadState values"));
                        }
                        return [4 /*yield*/, this._playheadState.setValues({
                                "mediaSeq": sessionState.mediaSeq,
                                "mediaSeqAudio": sessionState.mediaSeqAudio,
                                "mediaSeqSubtitle": sessionState.mediaSeqSubtitle,
                                "vodMediaSeqVideo": sessionState.vodMediaSeqVideo,
                                "vodMediaSeqAudio": sessionState.vodMediaSeqAudio,
                                "vodMediaSeqSubtitle": sessionState.vodMediaSeqSubtitle
                            }, isLeader)];
                    case 30:
                        updatedPlayhead = _g.sent();
                        playheadState = __assign(__assign({}, playheadState), updatedPlayhead);
                        if (currentVod.sequenceAlwaysContainNewSegments) {
                            mediaSequenceValue = currentVod.mediaSequenceValues[playheadState.vodMediaSeqVideo];
                            audioInfo = "";
                            if (this.use_demuxed_audio) {
                                mediaSequenceValueAudio = currentVod.mediaSequenceValuesAudio[playheadState.vodMediaSeqAudio];
                                audioInfo = " mseq[A]={".concat(playheadState.mediaSeqAudio + mediaSequenceValueAudio, "}");
                            }
                            subsInfo = "";
                            if (this.use_vtt_subtitles) {
                                mediaSequenceValueSubtitle = currentVod.mediaSequenceValuesSubtitle[playheadState.vodMediaSeqSubtitle];
                                subsInfo = " mseq[S]={".concat(playheadState.mediaSeqSubtitle + mediaSequenceValueSubtitle, "}");
                            }
                            debug("[".concat(this._sessionId, "]: Session can now serve mseq[V]={").concat(playheadState.mediaSeq + mediaSequenceValue, "}") + audioInfo + subsInfo);
                        }
                        debug("[".concat(this._sessionId, "]: INCREMENT (mseq=").concat(playheadState.mediaSeq + playheadState.vodMediaSeqVideo, ") vodMediaSeq=(").concat(playheadState.vodMediaSeqVideo, "_").concat(playheadState.vodMediaSeqAudio).concat(this.use_vtt_subtitles ? "_".concat(playheadState.vodMediaSeqSubtitle) : "", " of ").concat(currentVod.getLiveMediaSequencesCount(), "_").concat(currentVod.getLiveMediaSequencesCount("audio")).concat(this.use_vtt_subtitles ? "_".concat(currentVod.getLiveMediaSequencesCount("subtitle"), ")") : ")"));
                        if (!(playheadState.vodMediaSeqVideo < 2 || playheadState.mediaSeq !== this.prevMediaSeqOffset.video)) return [3 /*break*/, 35];
                        debug("[".concat(this._sessionId, "]: current[").concat(playheadState.vodMediaSeqVideo, "]_prev[").concat(this.prevVodMediaSeq.video, "]"));
                        debug("[".concat(this._sessionId, "]: current-offset[").concat(playheadState.mediaSeq, "]_prev-offset[").concat(this.prevMediaSeqOffset.video, "]"));
                        if (playheadState.vodMediaSeqVideo < this.prevVodMediaSeq.video || playheadState.mediaSeq !== this.prevMediaSeqOffset.video) {
                            this.isAllowedToClearVodCache = true;
                        }
                        if (!(!isLeader && this.isAllowedToClearVodCache)) return [3 /*break*/, 34];
                        debug("[".concat(this._sessionId, "]: Not a leader and have just set 'playheadState.vodMediaSeqVideo' to 0|1. Invalidate cache to ensure having the correct VOD."));
                        return [4 /*yield*/, this._sessionState.clearCurrentVodCache()];
                    case 31:
                        _g.sent();
                        return [4 /*yield*/, this._sessionState.getCurrentVod()];
                    case 32:
                        currentVod = _g.sent();
                        return [4 /*yield*/, this._playheadState.get("diffCompensation")];
                    case 33:
                        diffMs = _g.sent();
                        if (diffMs) {
                            this.diffCompensation = diffMs;
                            debug("[".concat(this._sessionId, "]: Setting diffCompensation->").concat(this.diffCompensation));
                            if (this.diffCompensation) {
                                this.timePositionOffset = this.diffCompensation;
                                cloudWatchLog(!this.cloudWatchLogging, 'engine-session', { event: 'timePositionOffsetUpdated', channel: this._sessionId, offsetMs: this.timePositionOffset });
                            }
                            else {
                                this.timePositionOffset = 0;
                            }
                        }
                        this.isAllowedToClearVodCache = false;
                        _g.label = 34;
                    case 34: return [3 /*break*/, 36];
                    case 35:
                        this.isAllowedToClearVodCache = true;
                        _g.label = 36;
                    case 36:
                        // Update Value for Previous Sequence
                        this.prevVodMediaSeq.video = playheadState.vodMediaSeqVideo;
                        this.prevMediaSeqOffset.video = playheadState.mediaSeq;
                        if (this.use_demuxed_audio) {
                            this.prevVodMediaSeq.audio = playheadState.vodMediaSeqAudio;
                            this.prevMediaSeqOffset.audio = playheadState.mediaSeqAudio;
                        }
                        if (this.use_vtt_subtitles) {
                            this.prevVodMediaSeq.subtitle = playheadState.vodMediaSeqSubtitle;
                            this.prevMediaSeqOffset.subtitle = playheadState.mediaSeqSubtitle;
                        }
                        m3u8 = currentVod.getLiveMediaSequences(playheadState.mediaSeq, 180000, playheadState.vodMediaSeqVideo, sessionState.discSeq);
                        return [4 /*yield*/, this._playheadState.setLastM3u8(m3u8)];
                    case 37:
                        _g.sent();
                        return [2 /*return*/, m3u8];
                }
            });
        });
    };
    Session.prototype.getMediaManifestAsync = function (bw, opts) {
        return __awaiter(this, void 0, void 0, function () {
            var tsLastRequestVideo, timeSinceLastRequest, sessionState, currentVod, _a, sequencesToIncrement, _b, _c, _d, m3u8, lastM3u8, _e, _f, _g, tsLastRequestVideo_1, timeSinceLastRequest_1, sessionState_1, _h, lastM3u8_1, _j, _k, _l;
            return __generator(this, function (_m) {
                switch (_m.label) {
                    case 0: // this function is no longer used and should be removed comment added 5/5-2023
                    return [4 /*yield*/, this._tickAsync()];
                    case 1:
                        _m.sent();
                        return [4 /*yield*/, this._sessionState.get("tsLastRequestVideo")];
                    case 2:
                        tsLastRequestVideo = _m.sent();
                        timeSinceLastRequest = (tsLastRequestVideo === null) ? 0 : Date.now() - tsLastRequestVideo;
                        return [4 /*yield*/, this._sessionState.getValues(["state", "vodMediaSeqVideo", "mediaSeq", "discSeq", "lastM3u8"])];
                    case 3:
                        sessionState = _m.sent();
                        return [4 /*yield*/, this._sessionState.getCurrentVod()];
                    case 4:
                        currentVod = _m.sent();
                        if (!currentVod) {
                            throw new Error('Session not ready');
                        }
                        if (!(sessionState.state === SessionState.VOD_NEXT_INITIATING)) return [3 /*break*/, 6];
                        _a = sessionState;
                        return [4 /*yield*/, this._sessionState.set("state", SessionState.VOD_PLAYING)];
                    case 5:
                        _a.state = _m.sent();
                        return [3 /*break*/, 8];
                    case 6:
                        sequencesToIncrement = Math.ceil(timeSinceLastRequest / this.averageSegmentDuration);
                        _b = sessionState;
                        return [4 /*yield*/, this._sessionState.increment("vodMediaSeqVideo", sequencesToIncrement)];
                    case 7:
                        _b.vodMediaSeqVideo = _m.sent();
                        _m.label = 8;
                    case 8:
                        if (!(sessionState.vodMediaSeqVideo >= currentVod.getLiveMediaSequencesCount() - 1)) return [3 /*break*/, 11];
                        _c = sessionState;
                        return [4 /*yield*/, this._sessionState.set("vodMediaSeqVideo", currentVod.getLiveMediaSequencesCount() - 1)];
                    case 9:
                        _c.vodMediaSeqVideo = _m.sent();
                        _d = sessionState;
                        return [4 /*yield*/, this._sessionState.set("state", SessionState.VOD_NEXT_INIT)];
                    case 10:
                        _d.state = _m.sent();
                        _m.label = 11;
                    case 11:
                        debug("[".concat(this._sessionId, "]: VIDEO ").concat(timeSinceLastRequest, " (").concat(this.averageSegmentDuration, ") bandwidth=").concat(bw, " vodMediaSeq=(").concat(sessionState.vodMediaSeqVideo, "_").concat(sessionState.vodMediaSeqAudio, ")"));
                        try {
                            m3u8 = currentVod.getLiveMediaSequences(sessionState.mediaSeq, bw, sessionState.vodMediaSeqVideo, sessionState.discSeq);
                        }
                        catch (exc) {
                            if (sessionState.lastM3u8[bw]) {
                                m3u8 = sessionState.lastM3u8[bw];
                            }
                            else {
                                logerror(this._sessionId, exc);
                                throw new Error('Failed to generate media manifest');
                            }
                        }
                        lastM3u8 = sessionState.lastM3u8;
                        lastM3u8[bw] = m3u8;
                        _e = sessionState;
                        return [4 /*yield*/, this._sessionState.set("lastM3u8", lastM3u8)];
                    case 12:
                        _e.lastM3u8 = _m.sent();
                        _f = sessionState;
                        return [4 /*yield*/, this._sessionState.set("lastServedM3u8", m3u8)];
                    case 13:
                        _f.lastServedM3u8 = _m.sent();
                        _g = sessionState;
                        return [4 /*yield*/, this._sessionState.set("tsLastRequestVideo", Date.now())];
                    case 14:
                        _g.tsLastRequestVideo = _m.sent();
                        if (!(sessionState.state === SessionState.VOD_NEXT_INIT)) return [3 /*break*/, 23];
                        return [4 /*yield*/, this._tickAsync()];
                    case 15:
                        _m.sent();
                        return [4 /*yield*/, this._sessionState.get("tsLastRequestVideo")];
                    case 16:
                        tsLastRequestVideo_1 = _m.sent();
                        timeSinceLastRequest_1 = (tsLastRequestVideo_1 === null) ? 0 : Date.now() - tsLastRequestVideo_1;
                        return [4 /*yield*/, this._sessionState.getValues(["state", "vodMediaSeqVideo", "mediaSeq", "discSeq", "lastM3u8"])];
                    case 17:
                        sessionState_1 = _m.sent();
                        if (!(sessionState_1.state === SessionState.VOD_NEXT_INITIATING)) return [3 /*break*/, 19];
                        _h = sessionState_1;
                        return [4 /*yield*/, this._sessionState.set("state", SessionState.VOD_PLAYING)];
                    case 18:
                        _h.state = _m.sent();
                        _m.label = 19;
                    case 19:
                        debug("[".concat(this._sessionId, "]: VIDEO ").concat(timeSinceLastRequest_1, " (").concat(this.averageSegmentDuration, ") bandwidth=").concat(bw, " vodMediaSeq=(").concat(sessionState_1.vodMediaSeqVideo, "_").concat(sessionState_1.vodMediaSeqAudio, ")"));
                        try {
                            m3u8 = currentVod.getLiveMediaSequences(sessionState_1.mediaSeq, bw, sessionState_1.vodMediaSeqVideo, sessionState_1.discSeq);
                        }
                        catch (exc) {
                            if (sessionState_1.lastM3u8[bw]) {
                                m3u8 = sessionState_1.lastM3u8[bw];
                            }
                            else {
                                logerror(this._sessionId, exc);
                                throw new Error('Failed to generate media manifest');
                            }
                        }
                        lastM3u8_1 = sessionState_1.lastM3u8;
                        lastM3u8_1[bw] = m3u8;
                        _j = sessionState_1;
                        return [4 /*yield*/, this._sessionState.set("lastM3u8", lastM3u8_1)];
                    case 20:
                        _j.lastM3u8 = _m.sent();
                        _k = sessionState_1;
                        return [4 /*yield*/, this._sessionState.set("lastServedM3u8", m3u8)];
                    case 21:
                        _k.lastServedM3u8 = _m.sent();
                        _l = sessionState_1;
                        return [4 /*yield*/, this._sessionState.set("tsLastRequestVideo", Date.now())];
                    case 22:
                        _l.tsLastRequestVideo = _m.sent();
                        return [2 /*return*/, m3u8];
                    case 23: return [2 /*return*/, m3u8];
                }
            });
        });
    };
    Session.prototype.getAudioManifestAsync = function (audioGroupId, audioLanguage, opts) {
        return __awaiter(this, void 0, void 0, function () {
            var tsLastRequestAudio, timeSinceLastRequest, sessionState, currentVod, sequencesToIncrement, _a, _b, m3u8, lastM3u8, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, this._sessionState.get("tsLastRequestAudio")];
                    case 1:
                        tsLastRequestAudio = _e.sent();
                        timeSinceLastRequest = (tsLastRequestAudio === null) ? 0 : Date.now() - tsLastRequestAudio;
                        return [4 /*yield*/, this._sessionState.getValues(["state", "vodMediaSeqVideo", "vodMediaSeqAudio", "mediaSeqAudio", "discSeqAudio", "lastM3u8"])];
                    case 2:
                        sessionState = _e.sent();
                        return [4 /*yield*/, this._sessionState.getCurrentVod()];
                    case 3:
                        currentVod = _e.sent();
                        if (!(sessionState.state !== SessionState.VOD_NEXT_INITIATING)) return [3 /*break*/, 6];
                        sequencesToIncrement = Math.ceil(timeSinceLastRequest / this.averageSegmentDuration);
                        if (!(sessionState.vodMediaSeqAudio < sessionState.vodMediaSeqVideo)) return [3 /*break*/, 6];
                        _a = sessionState;
                        return [4 /*yield*/, this._sessionState.increment("vodMediaSeqAudio", sequencesToIncrement)];
                    case 4:
                        _a.vodMediaSeqAudio = _e.sent();
                        if (!(sessionState.vodMediaSeqAudio >= currentVod.getLiveMediaSequencesCount("audio") - 1)) return [3 /*break*/, 6];
                        _b = sessionState;
                        return [4 /*yield*/, this._sessionState.set("vodMediaSeqAudio", currentVod.getLiveMediaSequencesCount("audio") - 1)];
                    case 5:
                        _b.vodMediaSeqAudio = _e.sent();
                        _e.label = 6;
                    case 6:
                        debug("[".concat(this._sessionId, "]: AUDIO ").concat(timeSinceLastRequest, " (").concat(this.averageSegmentDuration, ") audioGroupId=").concat(audioGroupId, " audioLanguage=").concat(audioLanguage, " vodMediaSeq=(").concat(sessionState.vodMediaSeqVideo, "_").concat(sessionState.vodMediaSeqAudio, ")"));
                        try {
                            m3u8 = currentVod.getLiveMediaAudioSequences(sessionState.mediaSeqAudio, audioGroupId, audioLanguage, sessionState.vodMediaSeqAudio, sessionState.discSeqAudio);
                        }
                        catch (exc) {
                            if (sessionState.lastM3u8[audioGroupId][audioLanguage]) {
                                m3u8 = sessionState.lastM3u8[audioGroupId][audioLanguage];
                            }
                            else {
                                logerror(this._sessionId, exc);
                                throw new Error('Failed to generate audio manifest');
                            }
                        }
                        lastM3u8 = sessionState.lastM3u8;
                        lastM3u8[audioGroupId] = {};
                        lastM3u8[audioGroupId][audioLanguage] = m3u8;
                        _c = sessionState;
                        return [4 /*yield*/, this._sessionState.set("lastM3u8", lastM3u8)];
                    case 7:
                        _c.lastM3u8 = _e.sent(); // for audio?
                        _d = sessionState;
                        return [4 /*yield*/, this._sessionState.set("tsLastRequestAudio", Date.now())];
                    case 8:
                        _d.tsLastRequestAudio = _e.sent();
                        return [2 /*return*/, m3u8];
                }
            });
        });
    };
    Session.prototype.getMasterManifestAsync = function (filter) {
        return __awaiter(this, void 0, void 0, function () {
            var m3u8, currentVod, audioGroupIds, defaultAudioGroupId, defaultSubtitleGroupId, hasClosedCaptions, i, audioGroupId, j, audioTrack, _a, _, channels, audioGroupIdFileName, subtitleGroupIds, i, subtitleGroupId, j, subtitleTrack, sessionProfile;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        m3u8 = "#EXTM3U\n";
                        m3u8 += "#EXT-X-VERSION:4\n";
                        m3u8 += m3u8Header(this._instanceId);
                        if (!this._noSessionDataTags) {
                            m3u8 += "#EXT-X-SESSION-DATA:DATA-ID=\"eyevinn.tv.session.id\",VALUE=\"".concat(this._sessionId, "\"\n");
                            m3u8 += "#EXT-X-SESSION-DATA:DATA-ID=\"eyevinn.tv.eventstream\",VALUE=\"/eventstream/".concat(this._sessionId, "\"\n");
                        }
                        return [4 /*yield*/, this._sessionState.getCurrentVod()];
                    case 1:
                        currentVod = _b.sent();
                        if (!currentVod) {
                            throw new Error('Session not ready');
                        }
                        audioGroupIds = currentVod.getAudioGroups();
                        debug("[".concat(this._sessionId, "]: currentVod.getAudioGroups()=").concat(audioGroupIds.join(",")));
                        hasClosedCaptions = this._closedCaptions && this._closedCaptions.length > 0;
                        if (hasClosedCaptions) {
                            this._closedCaptions.forEach(function (cc) {
                                m3u8 += "#EXT-X-MEDIA:TYPE=CLOSED-CAPTIONS,GROUP-ID=\"cc\",LANGUAGE=\"".concat(cc.lang, "\",NAME=\"").concat(cc.name, "\",DEFAULT=").concat(cc.default ? "YES" : "NO", ",AUTOSELECT=").concat(cc.auto ? "YES" : "NO", ",INSTREAM-ID=\"").concat(cc.id, "\"\n");
                            });
                        }
                        if (this.use_demuxed_audio === true && this._audioTracks) {
                            if (audioGroupIds.length > 0) {
                                m3u8 += "# AUDIO groups\n";
                                for (i = 0; i < audioGroupIds.length; i++) {
                                    audioGroupId = audioGroupIds[i];
                                    for (j = 0; j < this._audioTracks.length; j++) {
                                        audioTrack = this._audioTracks[j];
                                        _a = currentVod.getAudioCodecsAndChannelsForGroupId(audioGroupId), _ = _a[0], channels = _a[1];
                                        audioGroupIdFileName = audioGroupId;
                                        if (audioTrack.enforceAudioGroupId) {
                                            audioGroupIdFileName = audioTrack.enforceAudioGroupId;
                                        }
                                        m3u8 += "#EXT-X-MEDIA:TYPE=AUDIO" +
                                            ",GROUP-ID=\"".concat(audioGroupId, "\"") +
                                            ",LANGUAGE=\"".concat(audioTrack.language, "\"") +
                                            ",NAME=\"".concat(audioTrack.name, "\"") +
                                            ",AUTOSELECT=YES,DEFAULT=".concat(audioTrack.default ? 'YES' : 'NO') +
                                            ",CHANNELS=\"".concat(channels ? channels : 2, "\"") +
                                            ",URI=\"master-".concat(audioGroupIdFileName, "_").concat(audioTrack.language, ".m3u8%3Bsession=").concat(this._sessionId, "\"") +
                                            "\n";
                                    }
                                }
                                // As of now, by default set StreamItem's AUDIO attribute to <first audio group-id>
                                defaultAudioGroupId = audioGroupIds[0];
                            }
                        }
                        if (this.use_vtt_subtitles) {
                            subtitleGroupIds = currentVod.getSubtitleGroups();
                            if (subtitleGroupIds.length > 0) {
                                m3u8 += "# Subtitle groups\n";
                                for (i = 0; i < subtitleGroupIds.length; i++) {
                                    subtitleGroupId = subtitleGroupIds[i];
                                    for (j = 0; j < this._subtitleTracks.length; j++) {
                                        subtitleTrack = this._subtitleTracks[j];
                                        // Make default track if set property is true.  TODO add enforce
                                        m3u8 += "#EXT-X-MEDIA:TYPE=SUBTITLES" +
                                            ",GROUP-ID=\"".concat(subtitleGroupId, "\"") +
                                            ",LANGUAGE=\"".concat(subtitleTrack.language, "\"") +
                                            ",NAME=\"".concat(subtitleTrack.name, "\"") +
                                            ",AUTOSELECT=YES,DEFAULT=".concat(subtitleTrack.default ? 'YES' : 'NO') +
                                            ",URI=\"subtitles-".concat(subtitleGroupId, "_").concat(subtitleTrack.language, ".m3u8%3Bsession=").concat(this._sessionId, "\"") +
                                            "\n";
                                    }
                                }
                                // As of now, by default set StreamItem's SUBTITLES attribute to <first subtitle group-id>
                                defaultSubtitleGroupId = subtitleGroupIds[0];
                            }
                        }
                        if (this._sessionProfile) {
                            sessionProfile = filter ? applyFilter(this._sessionProfile, filter) : this._sessionProfile;
                            sessionProfile.forEach(function (profile) {
                                if (_this.use_demuxed_audio) {
                                    // find matching audio group based on codec in stream
                                    var audioGroupIdToUse = void 0;
                                    var _a = codecsFromString(profile.codecs), _ = _a[0], audioCodec = _a[1];
                                    if (audioCodec) {
                                        var profileChannels = profile.channels ? profile.channels : "2";
                                        audioGroupIdToUse = currentVod.getAudioGroupIdForCodecs(audioCodec, profileChannels);
                                        if (!audioGroupIds.includes(audioGroupIdToUse)) {
                                            audioGroupIdToUse = defaultAudioGroupId;
                                        }
                                    }
                                    debug("[".concat(_this._sessionId, "]: audioGroupIdToUse=").concat(audioGroupIdToUse));
                                    // skip stream if no corresponding audio group can be found
                                    if (audioGroupIdToUse) {
                                        m3u8 += '#EXT-X-STREAM-INF:BANDWIDTH=' + profile.bw +
                                            ',RESOLUTION=' + profile.resolution[0] + 'x' + profile.resolution[1] +
                                            ',CODECS="' + profile.codecs + '"' +
                                            ",AUDIO=\"".concat(audioGroupIdToUse, "\"") +
                                            (defaultSubtitleGroupId ? ",SUBTITLES=\"".concat(defaultSubtitleGroupId, "\"") : '') +
                                            (hasClosedCaptions ? ',CLOSED-CAPTIONS="cc"' : '') + '\n';
                                        m3u8 += "master" + profile.bw + ".m3u8%3Bsession=" + _this._sessionId + "\n";
                                    }
                                }
                                else {
                                    m3u8 += '#EXT-X-STREAM-INF:BANDWIDTH=' + profile.bw +
                                        ',RESOLUTION=' + profile.resolution[0] + 'x' + profile.resolution[1] +
                                        ',CODECS="' + profile.codecs + '"' +
                                        (defaultAudioGroupId ? ",AUDIO=\"".concat(defaultAudioGroupId, "\"") : '') +
                                        (defaultSubtitleGroupId ? ",SUBTITLES=\"".concat(defaultSubtitleGroupId, "\"") : '') +
                                        (hasClosedCaptions ? ',CLOSED-CAPTIONS="cc"' : '') + '\n';
                                    m3u8 += "master" + profile.bw + ".m3u8%3Bsession=" + _this._sessionId + "\n";
                                }
                            });
                        }
                        else {
                            currentVod.getUsageProfiles().forEach(function (profile) {
                                m3u8 += '#EXT-X-STREAM-INF:BANDWIDTH=' + profile.bw +
                                    ',RESOLUTION=' + profile.resolution +
                                    ',CODECS="' + profile.codecs + '"' +
                                    (defaultAudioGroupId ? ",AUDIO=\"".concat(defaultAudioGroupId, "\"") : '') +
                                    (defaultSubtitleGroupId ? ",SUBTITLES=\"".concat(defaultSubtitleGroupId, "\"") : '') +
                                    (hasClosedCaptions ? ',CLOSED-CAPTIONS="cc"' : '') + '\n';
                                m3u8 += "master" + profile.bw + ".m3u8%3Bsession=" + _this._sessionId + "\n";
                            });
                        }
                        this.produceEvent({
                            type: 'NOW_PLAYING',
                            data: {
                                id: this.currentMetadata.id,
                                title: this.currentMetadata.title,
                            }
                        });
                        this._sessionState.set("tsLastRequestMaster", Date.now());
                        return [2 /*return*/, m3u8];
                }
            });
        });
    };
    Session.prototype.getAudioGroupsAndLangs = function () {
        return __awaiter(this, void 0, void 0, function () {
            var currentVod, audioGroupIds, allAudioGroupsAndTheirLanguages;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._sessionState.getCurrentVod()];
                    case 1:
                        currentVod = _a.sent();
                        if (!currentVod) {
                            throw new Error('Session not ready');
                        }
                        audioGroupIds = currentVod.getAudioGroups();
                        allAudioGroupsAndTheirLanguages = {};
                        audioGroupIds.forEach(function (groupId) {
                            allAudioGroupsAndTheirLanguages[groupId] =
                                currentVod.getAudioLangsForAudioGroup(groupId);
                        });
                        return [2 /*return*/, allAudioGroupsAndTheirLanguages];
                }
            });
        });
    };
    Session.prototype.getSubtitleGroupsAndLangs = function () {
        return __awaiter(this, void 0, void 0, function () {
            var currentVod, subtitleGroupIds, allSubtitleGroupsAndTheirLanguages;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._sessionState.getCurrentVod()];
                    case 1:
                        currentVod = _a.sent();
                        if (!currentVod) {
                            throw new Error('Session not ready');
                        }
                        subtitleGroupIds = currentVod.getSubtitleGroups();
                        allSubtitleGroupsAndTheirLanguages = {};
                        subtitleGroupIds.forEach(function (groupId) {
                            allSubtitleGroupsAndTheirLanguages[groupId] =
                                currentVod.getSubtitleLangsForSubtitleGroup(groupId);
                        });
                        return [2 /*return*/, allSubtitleGroupsAndTheirLanguages];
                }
            });
        });
    };
    Session.prototype.consumeEvent = function () {
        return this._events.shift();
    };
    Session.prototype.produceEvent = function (event) {
        if (this._sessionEventStream) {
            this._events.push(event);
            if (this._events.length > EVENT_LIST_LIMIT) {
                this.consumeEvent();
            }
        }
    };
    Session.prototype.hasPlayhead = function () {
        return !this.disabledPlayhead;
    };
    Session.prototype._insertSlate = function (currentVod) {
        return __awaiter(this, void 0, void 0, function () {
            var slateVod, sessionState, endValue, endValueAudio, endValueSubtitle, lastDiscontinuity, lastDiscontinuityAudio, lastDiscontinuitySubtitle, isLeader, updatedSessionState, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.slateUri) return [3 /*break*/, 7];
                        console.error("[".concat(this._sessionId, "]: Will insert slate"));
                        return [4 /*yield*/, this._loadSlate(currentVod)];
                    case 1:
                        slateVod = _b.sent();
                        debug("[".concat(this._sessionId, "]: slate loaded"));
                        return [4 /*yield*/, this._sessionState.getValues(["slateCount", "mediaSeq", "discSeq", "mediaSeqAudio", "discSeqAudio", "mediaSeqSubtitle", "discSeqSubtitle"])];
                    case 2:
                        sessionState = _b.sent();
                        endValue = 0;
                        endValueAudio = 0;
                        endValueSubtitle = 0;
                        lastDiscontinuity = 0;
                        lastDiscontinuityAudio = 0;
                        lastDiscontinuitySubtitle = 0;
                        if (currentVod) {
                            if (currentVod.sequenceAlwaysContainNewSegments) {
                                endValue = currentVod.getLastSequenceMediaSequenceValue();
                                endValueAudio = currentVod.getLastSequenceMediaSequenceValueAudio();
                                endValueSubtitle = currentVod.getLastSequenceMediaSequenceValueSubtitle();
                            }
                            else {
                                endValue = currentVod.getLiveMediaSequencesCount();
                                endValueAudio = currentVod.getLiveMediaSequencesCount("audio");
                                endValueSubtitle = currentVod.getLiveMediaSequencesCount("subtitle");
                            }
                            lastDiscontinuity = currentVod.getLastDiscontinuity();
                            lastDiscontinuityAudio = currentVod.getLastDiscontinuityAudio();
                            lastDiscontinuitySubtitle = currentVod.getLastDiscontinuitySubtitle();
                        }
                        return [4 /*yield*/, this._sessionStateStore.isLeader(this._instanceId)];
                    case 3:
                        isLeader = _b.sent();
                        return [4 /*yield*/, this._sessionState.setValues({
                                "vodMediaSeqVideo": 0,
                                "vodMediaSeqAudio": 0,
                                "vodMediaSeqSubtitle": 0,
                                "state": SessionState.VOD_NEXT_INITIATING,
                                "mediaSeq": sessionState.mediaSeq + endValue,
                                "mediaSeqAudio": sessionState.mediaSeqAudio + endValueAudio,
                                "mediaSeqSubtitle": sessionState.mediaSeqSubtitle + endValueAudio,
                                "discSeq": sessionState.discSeq + lastDiscontinuity,
                                "discSeqAudio": sessionState.discSeqAudio + lastDiscontinuityAudio,
                                "discSeqSubtitle": sessionState.discSeqSubtitle + lastDiscontinuitySubtitle,
                                "slateCount": sessionState.slateCount + 1
                            })];
                    case 4:
                        updatedSessionState = _b.sent();
                        sessionState = __assign(__assign({}, sessionState), updatedSessionState);
                        return [4 /*yield*/, this._sessionState.setCurrentVod(slateVod)];
                    case 5:
                        _b.sent();
                        _a = this;
                        return [4 /*yield*/, this._playheadState.set("playheadRef", Date.now(), isLeader)];
                    case 6:
                        _a.currentPlayheadRef = _b.sent();
                        cloudWatchLog(!this.cloudWatchLogging, 'engine-session', { event: 'slateInserted', channel: this._sessionId });
                        return [2 /*return*/, slateVod];
                    case 7: return [2 /*return*/, null];
                }
            });
        });
    };
    Session.prototype._tickAsync = function () {
        return __awaiter(this, void 0, void 0, function () {
            var newVod, sessionState, isLeader, currentVod, vodResponse, _a, nextVodPromise, nextVodStart, _b, loadPromise, hlsOpts, _c, mediaManifestLoader, audioManifestLoader, loadStart, updatedSessionState, _d, _e, _f, _g, err_4, _h, length_1, endMseqValue, endMseqValueAudio, endMseqValueSubtitle, lastDiscontinuity, lastDiscontinuityAudio, lastDiscontinuitySubtitle, _j, vodPromise, gracePeriod, nextVodStart, _k, loadPromise, hlsOpts, _l, mediaManifestLoader, audioManifestLoader, loadStart, _m, _o, updatedSessionState, _p, _q, diffMs, err_5, startTS, _r, mSeq, currentVod_1, dSeq, mSeqOffset, reloadBehind, segments, playheadState, nextMseq, _s, _t, err_6;
            var _this = this;
            return __generator(this, function (_u) {
                switch (_u.label) {
                    case 0: return [4 /*yield*/, this._sessionState.getValues(["state", "assetId", "vodMediaSeqVideo", "vodMediaSeqAudio", "vodMediaSeqSubtitle", "mediaSeq", "mediaSeqAudio", "mediaSeqSubtitle", "discSeq", "discSeqAudio", "discSeqSubtitle", "nextVod"])];
                    case 1:
                        sessionState = _u.sent();
                        return [4 /*yield*/, this._sessionStateStore.isLeader(this._instanceId)];
                    case 2:
                        isLeader = _u.sent();
                        return [4 /*yield*/, this._sessionState.getCurrentVod()];
                    case 3:
                        currentVod = _u.sent();
                        if (!sessionState.state) {
                            sessionState.state = SessionState.VOD_INIT;
                        }
                        _a = sessionState.state;
                        switch (_a) {
                            case SessionState.VOD_INIT: return [3 /*break*/, 4];
                            case SessionState.VOD_INIT_BY_ID: return [3 /*break*/, 4];
                            case SessionState.VOD_PLAYING: return [3 /*break*/, 26];
                            case SessionState.VOD_NEXT_INITIATING: return [3 /*break*/, 32];
                            case SessionState.VOD_NEXT_INIT: return [3 /*break*/, 33];
                            case SessionState.VOD_RELOAD_INIT: return [3 /*break*/, 61];
                            case SessionState.VOD_RELOAD_INITIATING: return [3 /*break*/, 83];
                        }
                        return [3 /*break*/, 87];
                    case 4:
                        _u.trys.push([4, 23, , 26]);
                        // Needed if store was reset
                        return [4 /*yield*/, this._sessionStateStore.clearLeaderCache()];
                    case 5:
                        // Needed if store was reset
                        _u.sent();
                        return [4 /*yield*/, this._sessionStateStore.isLeader(this._instanceId)];
                    case 6:
                        isLeader = _u.sent();
                        nextVodPromise = void 0;
                        if (sessionState.state === SessionState.VOD_INIT) {
                            debug("[".concat(this._sessionId, "]: state=VOD_INIT"));
                            nextVodPromise = this._getNextVod();
                        }
                        else if (sessionState.state === SessionState.VOD_INIT_BY_ID) {
                            debug("[".concat(this._sessionId, "]: state=VOD_INIT_BY_ID ").concat(sessionState.assetId));
                            nextVodPromise = this._getNextVodById(sessionState.assetId);
                        }
                        if (!isLeader) return [3 /*break*/, 19];
                        nextVodStart = Date.now();
                        return [4 /*yield*/, nextVodPromise];
                    case 7:
                        vodResponse = _u.sent();
                        _b = sessionState;
                        return [4 /*yield*/, this._sessionState.set("nextVod", vodResponse)];
                    case 8:
                        _b.nextVod = _u.sent();
                        cloudWatchLog(!this.cloudWatchLogging, 'engine-session', { event: 'nextVod', channel: this._sessionId, reqTimeMs: Date.now() - nextVodStart });
                        loadPromise = void 0;
                        if (!!vodResponse.type) return [3 /*break*/, 12];
                        debug("[".concat(this._sessionId, "]: got first VOD uri=").concat(vodResponse.uri, ":").concat(vodResponse.offset || 0));
                        hlsOpts = { sequenceAlwaysContainNewSegments: this.alwaysNewSegments,
                            forcedDemuxMode: this.use_demuxed_audio,
                            dummySubtitleEndpoint: this.dummySubtitleEndpoint,
                            subtitleSliceEndpoint: this.subtitleSliceEndpoint,
                            shouldContainSubtitles: this.use_vtt_subtitles,
                            expectedSubtitleTracks: this._subtitleTracks,
                            alwaysMapBandwidthByNearest: this.alwaysMapBandwidthByNearest,
                            skipSerializeMediaSequences: this.partialStoreHLSVod
                        };
                        newVod = new HLSVod(vodResponse.uri, [], vodResponse.unixTs, vodResponse.offset * 1000, m3u8Header(this._instanceId), hlsOpts);
                        if (vodResponse.timedMetadata) {
                            Object.keys(vodResponse.timedMetadata).map(function (k) {
                                newVod.addMetadata(k, vodResponse.timedMetadata[k]);
                            });
                        }
                        currentVod = newVod;
                        if (!vodResponse.desiredDuration) return [3 /*break*/, 10];
                        return [4 /*yield*/, this._truncateVod(vodResponse)];
                    case 9:
                        _c = _u.sent(), mediaManifestLoader = _c.mediaManifestLoader, audioManifestLoader = _c.audioManifestLoader;
                        loadPromise = currentVod.load(null, mediaManifestLoader, audioManifestLoader);
                        return [3 /*break*/, 11];
                    case 10:
                        loadPromise = currentVod.load();
                        _u.label = 11;
                    case 11: return [3 /*break*/, 13];
                    case 12:
                        if (vodResponse.type === 'gap') {
                            loadPromise = new Promise(function (resolve, reject) {
                                _this._fillGap(null, vodResponse.desiredDuration)
                                    .then(function (gapVod) {
                                    currentVod = gapVod;
                                    resolve(gapVod);
                                }).catch(reject);
                            });
                        }
                        _u.label = 13;
                    case 13:
                        loadStart = Date.now();
                        return [4 /*yield*/, loadPromise];
                    case 14:
                        _u.sent();
                        cloudWatchLog(!this.cloudWatchLogging, 'engine-session', { event: 'loadVod', channel: this._sessionId, loadTimeMs: Date.now() - loadStart });
                        debug("[".concat(this._sessionId, "]: first VOD loaded"));
                        debug("[".concat(this._sessionId, "]: ").concat(currentVod.getDeltaTimes()));
                        debug("[".concat(this._sessionId, "]: playhead positions [V]=").concat(currentVod.getPlayheadPositions("video")));
                        debug("[".concat(this._sessionId, "]: playhead positions [A]=").concat(currentVod.getPlayheadPositions("audio")));
                        debug("[".concat(this._sessionId, "]: playhead positions [S]=").concat(currentVod.getPlayheadPositions("subtitle")));
                        return [4 /*yield*/, this._sessionState.setValues({
                                "mediaSeq": 0,
                                "mediaSeqAudio": 0,
                                "mediaSeqSubtitle": 0,
                                "discSeq": 0,
                                "discSeqAudio": 0,
                                "discSeqSubtitle": 0,
                                "vodMediaSeqVideo": 0,
                                "vodMediaSeqAudio": 0,
                                "vodMediaSeqSubtitle": 0,
                                "state": SessionState.VOD_PLAYING
                            })];
                    case 15:
                        updatedSessionState = _u.sent();
                        sessionState = __assign(__assign({}, sessionState), updatedSessionState);
                        this.produceEvent({
                            type: 'NOW_PLAYING',
                            data: {
                                id: this.currentMetadata.id,
                                title: this.currentMetadata.title,
                            }
                        });
                        _d = sessionState;
                        return [4 /*yield*/, this._sessionState.setCurrentVod(currentVod, { ttl: currentVod.getDuration() * 1000 })];
                    case 16:
                        _d.currentVod = _u.sent();
                        _e = this;
                        return [4 /*yield*/, this._playheadState.set("playheadRef", Date.now(), isLeader)];
                    case 17:
                        _e.currentPlayheadRef = _u.sent();
                        return [4 /*yield*/, this._sessionState.remove("nextVod")];
                    case 18:
                        _u.sent();
                        return [2 /*return*/];
                    case 19:
                        debug("[".concat(this._sessionId, "]: not a leader so will go directly to state VOD_PLAYING"));
                        _f = sessionState;
                        return [4 /*yield*/, this._sessionState.set("state", SessionState.VOD_PLAYING)];
                    case 20:
                        _f.state = _u.sent();
                        _g = sessionState;
                        return [4 /*yield*/, this._sessionState.getCurrentVod()];
                    case 21:
                        _g.currentVod = _u.sent();
                        return [2 /*return*/];
                    case 22: return [3 /*break*/, 26];
                    case 23:
                        err_4 = _u.sent();
                        console.error("[".concat(this._sessionId, "]: Failed to init first VOD"));
                        if (this._assetManager.handleError) {
                            this._assetManager.handleError(new Error("Failed to init first VOD"), vodResponse);
                        }
                        cloudWatchLog(!this.cloudWatchLogging, 'engine-session', { event: 'error', on: 'firstvod', channel: this._sessionId, err: err_4, vod: vodResponse });
                        debug(err_4);
                        return [4 /*yield*/, this._sessionState.remove("nextVod")];
                    case 24:
                        _u.sent();
                        return [4 /*yield*/, this._insertSlate(currentVod)];
                    case 25:
                        currentVod = _u.sent();
                        if (!currentVod) {
                            debug("No slate to load");
                            throw err_4;
                        }
                        return [3 /*break*/, 26];
                    case 26:
                        if (!isLeader) return [3 /*break*/, 30];
                        // Handle edge case where store has been reset, but leader has not cleared cache.
                        if (this.prevVodMediaSeq.video === null) {
                            this.prevVodMediaSeq.video = sessionState.vodMediaSeqVideo;
                        }
                        if (this.prevMediaSeqOffset.video === null) {
                            this.prevMediaSeqOffset.video = sessionState.mediaSeq;
                        }
                        if (this.use_demuxed_audio) {
                            if (this.prevVodMediaSeq.audio === null) {
                                this.prevVodMediaSeq.audio = sessionState.vodMediaSeqAudio;
                            }
                            if (this.prevMediaSeqOffset.audio === null) {
                                this.prevMediaSeqOffset.audio = sessionState.mediaSeqAudio;
                            }
                        }
                        if (this.use_vtt_subtitles) {
                            if (this.prevVodMediaSeq.subtitle === null) {
                                this.prevVodMediaSeq.subtitle = sessionState.vodMediaSeqSubtitle;
                            }
                            if (this.prevMediaSeqOffset.audio === null) {
                                this.prevMediaSeqOffset.subtitle = sessionState.mediaSeqSubtitle;
                            }
                        }
                        if (!(sessionState.vodMediaSeqVideo < this.prevVodMediaSeq.video)) return [3 /*break*/, 29];
                        debug("[".concat(this._sessionId, "]: state=VOD_PLAYING, current[").concat(sessionState.vodMediaSeqVideo, "], prev[").concat(this.prevVodMediaSeq.video, "], total[").concat(currentVod.getLiveMediaSequencesCount(), "]"));
                        return [4 /*yield*/, this._sessionState.clearCurrentVodCache()];
                    case 27:
                        _u.sent();
                        return [4 /*yield*/, this._sessionState.getCurrentVod()];
                    case 28:
                        currentVod = _u.sent();
                        this.prevVodMediaSeq.video = sessionState.vodMediaSeqVideo;
                        this.prevVodMediaSeq.audio = sessionState.vodMediaSeqAudio;
                        this.prevVodMediaSeq.subtitle = sessionState.vodMediaSeqSubtitle;
                        _u.label = 29;
                    case 29: return [3 /*break*/, 31];
                    case 30:
                        // Handle edge case where Leader loaded next vod but Follower remained in state=VOD_PLAYING
                        if ((this.prevMediaSeqOffset.video !== null) & (sessionState.mediaSeq !== this.prevMediaSeqOffset.video)) {
                            debug("[".concat(this._sessionId, "]: state=VOD_PLAYING, current[").concat(sessionState.vodMediaSeqVideo, "], prev[").concat(this.prevVodMediaSeq.video, "], total[").concat(currentVod.getLiveMediaSequencesCount(), "]"));
                            debug("[".concat(this._sessionId, "]: mediaSeq offsets -> current[").concat(sessionState.vodMediaSeqVideo, "], prev[").concat(this.prevVodMediaSeq.video, "]"));
                            // Allow Follower to clear VodCache...
                            this.isAllowedToClearVodCache = true;
                        }
                        _u.label = 31;
                    case 31:
                        debug("[".concat(this._sessionId, "]: state=VOD_PLAYING (").concat(sessionState.vodMediaSeqVideo, "_").concat(sessionState.vodMediaSeqAudio, "_").concat(sessionState.vodMediaSeqSubtitle, ", ").concat(currentVod.getLiveMediaSequencesCount(), "_").concat(currentVod.getLiveMediaSequencesCount("audio"), "_").concat(currentVod.getLiveMediaSequencesCount("subtitle"), ")"));
                        return [2 /*return*/];
                    case 32:
                        debug("[".concat(this._sessionId, "]: state=VOD_NEXT_INITIATING (").concat(sessionState.vodMediaSeqVideo, "_").concat(sessionState.vodMediaSeqAudio, "_").concat(sessionState.vodMediaSeqSubtitle, ", ").concat(currentVod.getLiveMediaSequencesCount(), "_").concat(currentVod.getLiveMediaSequencesCount("audio"), "_").concat(currentVod.getLiveMediaSequencesCount("subtitle"), ")"));
                        if (!isLeader) {
                            debug("[".concat(this._sessionId, "]: not the leader so just waiting for the VOD to be initiated"));
                        }
                        // Allow Leader|Follower to clear vodCache...
                        this.isAllowedToClearVodCache = true;
                        return [2 /*return*/];
                    case 33:
                        _u.trys.push([33, 57, , 60]);
                        debug("[".concat(this._sessionId, "]: state=VOD_NEXT_INIT"));
                        if (!isLeader) return [3 /*break*/, 52];
                        if (!!currentVod) return [3 /*break*/, 35];
                        debug("[".concat(this._sessionId, "]: no VOD to append to, assume first VOD to init"));
                        _h = sessionState;
                        return [4 /*yield*/, this._sessionState.set("state", SessionState.VOD_INIT)];
                    case 34:
                        _h.state = _u.sent();
                        return [2 /*return*/];
                    case 35:
                        length_1 = currentVod.getLiveMediaSequencesCount();
                        endMseqValue = void 0;
                        endMseqValueAudio = void 0;
                        endMseqValueSubtitle = void 0;
                        if (currentVod.sequenceAlwaysContainNewSegments) {
                            endMseqValue = currentVod.getLastSequenceMediaSequenceValue();
                            endMseqValueAudio = currentVod.getLastSequenceMediaSequenceValueAudio();
                            endMseqValueSubtitle = currentVod.getLastSequenceMediaSequenceValueSubtitle();
                        }
                        else {
                            endMseqValue = currentVod.getLiveMediaSequencesCount();
                            endMseqValueAudio = currentVod.getLiveMediaSequencesCount("audio");
                            endMseqValueSubtitle = currentVod.getLiveMediaSequencesCount("subtitle");
                        }
                        lastDiscontinuity = currentVod.getLastDiscontinuity();
                        lastDiscontinuityAudio = currentVod.getLastDiscontinuityAudio();
                        lastDiscontinuitySubtitle = currentVod.getLastDiscontinuitySubtitle();
                        _j = sessionState;
                        return [4 /*yield*/, this._sessionState.set("state", SessionState.VOD_NEXT_INITIATING)];
                    case 36:
                        _j.state = _u.sent();
                        vodPromise = this._getNextVod();
                        if (!(length_1 === 1)) return [3 /*break*/, 38];
                        gracePeriod = (this.averageSegmentDuration / 2);
                        debug("[".concat(this._sessionId, "]: adding a grace period before calling nextVod: ").concat(gracePeriod, "ms"));
                        return [4 /*yield*/, timer(gracePeriod)];
                    case 37:
                        _u.sent();
                        _u.label = 38;
                    case 38:
                        nextVodStart = Date.now();
                        return [4 /*yield*/, vodPromise];
                    case 39:
                        vodResponse = _u.sent();
                        _k = sessionState;
                        return [4 /*yield*/, this._sessionState.set("nextVod", vodResponse)];
                    case 40:
                        _k.nextVod = _u.sent();
                        cloudWatchLog(!this.cloudWatchLogging, 'engine-session', { event: 'nextVod', channel: this._sessionId, reqTimeMs: Date.now() - nextVodStart });
                        loadPromise = void 0;
                        if (!!vodResponse.type) return [3 /*break*/, 44];
                        debug("[".concat(this._sessionId, "]: got next VOD uri=").concat(vodResponse.uri, ":").concat(vodResponse.offset));
                        hlsOpts = { sequenceAlwaysContainNewSegments: this.alwaysNewSegments,
                            forcedDemuxMode: this.use_demuxed_audio,
                            dummySubtitleEndpoint: this.dummySubtitleEndpoint,
                            subtitleSliceEndpoint: this.subtitleSliceEndpoint,
                            shouldContainSubtitles: this.use_vtt_subtitles,
                            expectedSubtitleTracks: this._subtitleTracks,
                            alwaysMapBandwidthByNearest: this.alwaysMapBandwidthByNearest,
                            skipSerializeMediaSequences: this.partialStoreHLSVod
                        };
                        newVod = new HLSVod(vodResponse.uri, null, vodResponse.unixTs, vodResponse.offset * 1000, m3u8Header(this._instanceId), hlsOpts);
                        if (vodResponse.timedMetadata) {
                            Object.keys(vodResponse.timedMetadata).map(function (k) {
                                newVod.addMetadata(k, vodResponse.timedMetadata[k]);
                            });
                        }
                        this.produceEvent({
                            type: 'NEXT_VOD_SELECTED',
                            data: {
                                id: this.currentMetadata.id,
                                uri: vodResponse.uri,
                                title: this.currentMetadata.title || '',
                            }
                        });
                        if (!vodResponse.desiredDuration) return [3 /*break*/, 42];
                        return [4 /*yield*/, this._truncateVod(vodResponse)];
                    case 41:
                        _l = _u.sent(), mediaManifestLoader = _l.mediaManifestLoader, audioManifestLoader = _l.audioManifestLoader;
                        loadPromise = newVod.loadAfter(currentVod, null, mediaManifestLoader, audioManifestLoader);
                        return [3 /*break*/, 43];
                    case 42:
                        loadPromise = newVod.loadAfter(currentVod);
                        _u.label = 43;
                    case 43:
                        if (vodResponse.diffMs) {
                            this.diffCompensation = vodResponse.diffMs;
                            if (this.diffCompensation) {
                                this.timePositionOffset = this.diffCompensation;
                                cloudWatchLog(!this.cloudWatchLogging, 'engine-session', { event: 'timePositionOffsetUpdated', channel: this._sessionId, offsetMs: this.timePositionOffset });
                            }
                            else {
                                this.timePositionOffset = 0;
                            }
                        }
                        return [3 /*break*/, 45];
                    case 44:
                        loadPromise = new Promise(function (resolve, reject) {
                            _this._fillGap(currentVod, vodResponse.desiredDuration)
                                .then(function (gapVod) {
                                newVod = gapVod;
                                resolve(newVod);
                            }).catch(reject);
                        });
                        _u.label = 45;
                    case 45:
                        loadStart = Date.now();
                        return [4 /*yield*/, ChaosMonkey.loadVod(loadPromise)];
                    case 46:
                        _u.sent();
                        cloudWatchLog(!this.cloudWatchLogging, 'engine-session', { event: 'loadVod', channel: this._sessionId, loadTimeMs: Date.now() - loadStart });
                        this.leaderIsSettingNextVod = true;
                        debug("[".concat(this._sessionId, "]: next VOD loaded (").concat(newVod.getDeltaTimes(), ")"));
                        debug("[".concat(this._sessionId, "]: playhead positions [V]=").concat(newVod.getPlayheadPositions("video")));
                        debug("[".concat(this._sessionId, "]: playhead positions [A]=").concat(newVod.getPlayheadPositions("audio")));
                        debug("[".concat(this._sessionId, "]: playhead positions [S]=").concat(newVod.getPlayheadPositions("subtitle")));
                        currentVod = newVod;
                        debug("[".concat(this._sessionId, "]: msequences=").concat(currentVod.getLiveMediaSequencesCount(), "; audio msequences=").concat(currentVod.getLiveMediaSequencesCount("audio"), "; subtitle msequences=").concat(currentVod.getLiveMediaSequencesCount("subtitle")));
                        _m = sessionState;
                        return [4 /*yield*/, this._sessionState.setCurrentVod(currentVod, { ttl: currentVod.getDuration() * 1000 })];
                    case 47:
                        _m.currentVod = _u.sent();
                        _o = this;
                        return [4 /*yield*/, this._playheadState.set("playheadRef", Date.now(), isLeader)];
                    case 48:
                        _o.currentPlayheadRef = _u.sent();
                        return [4 /*yield*/, this._sessionState.setValues({
                                "vodMediaSeqVideo": 0,
                                "vodMediaSeqAudio": 0,
                                "vodMediaSeqSubtitle": 0,
                                "mediaSeq": sessionState.mediaSeq + endMseqValue,
                                "mediaSeqAudio": sessionState.mediaSeqAudio + endMseqValueAudio,
                                "mediaSeqSubtitle": sessionState.mediaSeqSubtitle + endMseqValueSubtitle,
                                "discSeq": sessionState.discSeq + lastDiscontinuity,
                                "discSeqAudio": sessionState.discSeqAudio + lastDiscontinuityAudio,
                                "discSeqSubtitle": sessionState.discSeqSubtitle + lastDiscontinuitySubtitle
                            })];
                    case 49:
                        updatedSessionState = _u.sent();
                        sessionState = __assign(__assign({}, sessionState), updatedSessionState);
                        debug("[".concat(this._sessionId, "]: new sequence data set in store V[").concat(sessionState.mediaSeq, "][").concat(sessionState.discSeq, "]_A[").concat(sessionState.mediaSeqAudio, "][").concat(sessionState.discSeqAudio, "]_S[").concat(sessionState.mediaSeqSubtitle, "][").concat(sessionState.discSeqSubtitle, "]"));
                        return [4 /*yield*/, this._sessionState.remove("nextVod")];
                    case 50:
                        _u.sent();
                        this.leaderIsSettingNextVod = false;
                        return [4 /*yield*/, this._playheadState.set("diffCompensation", this.diffCompensation, isLeader)];
                    case 51:
                        _u.sent();
                        debug("[".concat(this._sessionId, "]: sharing durrent vods diffCompensation=").concat(this.diffCompensation));
                        this.produceEvent({
                            type: 'NOW_PLAYING',
                            data: {
                                id: this.currentMetadata.id,
                                title: this.currentMetadata.title,
                            }
                        });
                        return [2 /*return*/];
                    case 52:
                        debug("[".concat(this._sessionId, "]: not a leader so will go directly to state VOD_NEXT_INITIATING"));
                        this.waitingForNextVod = true;
                        _p = sessionState;
                        return [4 /*yield*/, this._sessionState.set("state", SessionState.VOD_NEXT_INITIATING)];
                    case 53:
                        _p.state = _u.sent();
                        // Allow Leader|Follower to clear vodCache...
                        this.isAllowedToClearVodCache = true;
                        _q = sessionState;
                        return [4 /*yield*/, this._sessionState.getCurrentVod()];
                    case 54:
                        _q.currentVod = _u.sent();
                        return [4 /*yield*/, this._playheadState.get("diffCompensation")];
                    case 55:
                        diffMs = _u.sent();
                        if (diffMs) {
                            this.diffCompensation = diffMs;
                            debug("[".concat(this._sessionId, "]: Setting diffCompensation=").concat(this.diffCompensation));
                            if (this.diffCompensation) {
                                this.timePositionOffset = this.diffCompensation;
                                cloudWatchLog(!this.cloudWatchLogging, 'engine-session', { event: 'timePositionOffsetUpdated', channel: this._sessionId, offsetMs: this.timePositionOffset });
                            }
                            else {
                                this.timePositionOffset = 0;
                            }
                        }
                        _u.label = 56;
                    case 56: return [3 /*break*/, 60];
                    case 57:
                        err_5 = _u.sent();
                        console.error("[".concat(this._sessionId, "]: Failed to init next VOD"));
                        debug("[".concat(this._sessionId, "]: ").concat(err_5));
                        if (this._assetManager.handleError) {
                            this._assetManager.handleError(new Error("Failed to init next VOD"), vodResponse);
                        }
                        cloudWatchLog(!this.cloudWatchLogging, 'engine-session', { event: 'error', on: 'nextvod', channel: this._sessionId, err: err_5, vod: vodResponse });
                        return [4 /*yield*/, this._sessionState.remove("nextVod")];
                    case 58:
                        _u.sent();
                        return [4 /*yield*/, this._insertSlate(currentVod)];
                    case 59:
                        currentVod = _u.sent();
                        if (!currentVod) {
                            debug("No slate to load");
                            throw err_5;
                        }
                        // Allow Leader|Follower to clear vodCache...
                        this.isAllowedToClearVodCache = true;
                        return [3 /*break*/, 60];
                    case 60: return [3 /*break*/, 88];
                    case 61:
                        _u.trys.push([61, 81, , 82]);
                        debug("[".concat(this._sessionId, "]: state=VOD_RELOAD_INIT"));
                        if (!isLeader) return [3 /*break*/, 78];
                        startTS = Date.now();
                        // 1) To tell Follower that, Leader is working on it!
                        _r = sessionState;
                        return [4 /*yield*/, this._sessionState.set("state", SessionState.VOD_RELOAD_INITIATING)];
                    case 62:
                        // 1) To tell Follower that, Leader is working on it!
                        _r.state = _u.sent();
                        mSeq = this.switchDataForSession.mediaSeq;
                        return [4 /*yield*/, this._sessionState.getCurrentVod()];
                    case 63:
                        currentVod_1 = _u.sent();
                        if (currentVod_1.sequenceAlwaysContainNewSegments) {
                            // (!) will need to compensate if using this setting on HLSVod Object.
                            Object.keys(this.switchDataForSession.transitionSegments).forEach(function (bw) {
                                var shiftedSeg = _this.switchDataForSession.transitionSegments[bw].shift();
                                if (shiftedSeg && shiftedSeg.discontinuity) {
                                    shiftedSeg = _this.switchDataForSession.transitionSegments[bw].shift();
                                }
                            });
                        }
                        dSeq = this.switchDataForSession.discSeq;
                        mSeqOffset = this.switchDataForSession.mediaSeqOffset;
                        reloadBehind = this.switchDataForSession.reloadBehind;
                        segments = this.switchDataForSession.transitionSegments;
                        if ([mSeq, dSeq, mSeqOffset, reloadBehind, segments].includes(null)) {
                            debug("[".concat(this._sessionId, "]: LEADER: Cannot Reload VOD, missing switch-back data"));
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this._sessionState.set("mediaSeq", mSeq)];
                    case 64:
                        _u.sent();
                        return [4 /*yield*/, this._playheadState.set("mediaSeq", mSeq, isLeader)];
                    case 65:
                        _u.sent();
                        return [4 /*yield*/, this._sessionState.set("discSeq", dSeq)];
                    case 66:
                        _u.sent();
                        // TODO: support demux^
                        debug("[".concat(this._sessionId, "]: Setting current media and discontinuity count -> [").concat(mSeq, "]:[").concat(dSeq, "]"));
                        // 3) Set new media segments/currentVod, to carry on the continuity from session-live
                        debug("[".concat(this._sessionId, "]: LEADER: making changes to current VOD. I will also update currentVod in store."));
                        return [4 /*yield*/, this._playheadState.getValues(["vodMediaSeqVideo"])];
                    case 67:
                        playheadState = _u.sent();
                        nextMseq = playheadState.vodMediaSeqVideo + 1;
                        if (nextMseq > currentVod_1.getLiveMediaSequencesCount() - 1) {
                            nextMseq = currentVod_1.getLiveMediaSequencesCount() - 1;
                        }
                        // ---------------------------------------------------.
                        // TODO: Support reloading with audioSegments and SubtitleSegments as well |
                        // ---------------------------------------------------'
                        return [4 /*yield*/, currentVod_1.reload(nextMseq, segments, null, reloadBehind)];
                    case 68:
                        // ---------------------------------------------------.
                        // TODO: Support reloading with audioSegments and SubtitleSegments as well |
                        // ---------------------------------------------------'
                        _u.sent();
                        return [4 /*yield*/, this._sessionState.setCurrentVod(currentVod_1, { ttl: currentVod_1.getDuration() * 1000 })];
                    case 69:
                        _u.sent();
                        return [4 /*yield*/, this._sessionState.set("vodReloaded", 1)];
                    case 70:
                        _u.sent();
                        return [4 /*yield*/, this._sessionState.set("vodMediaSeqVideo", 0)];
                    case 71:
                        _u.sent();
                        return [4 /*yield*/, this._sessionState.set("vodMediaSeqAudio", 0)];
                    case 72:
                        _u.sent();
                        return [4 /*yield*/, this._sessionState.set("vodMediaSeqSubtitle", 0)];
                    case 73:
                        _u.sent();
                        return [4 /*yield*/, this._playheadState.set("vodMediaSeqVideo", 0, isLeader)];
                    case 74:
                        _u.sent();
                        return [4 /*yield*/, this._playheadState.set("vodMediaSeqAudio", 0, isLeader)];
                    case 75:
                        _u.sent();
                        return [4 /*yield*/, this._playheadState.set("vodMediaSeqSubtitle", 0, isLeader)];
                    case 76:
                        _u.sent();
                        _s = this;
                        return [4 /*yield*/, this._playheadState.set("playheadRef", Date.now(), isLeader)];
                    case 77:
                        _s.currentPlayheadRef = _u.sent();
                        // 4) Log to debug and cloudwatch
                        debug("[".concat(this._sessionId, "]: LEADER: Set new Reloaded VOD and vodMediaSeq counts in store."));
                        debug("[".concat(this._sessionId, "]: next VOD Reloaded (").concat(currentVod_1.getDeltaTimes(), ")"));
                        debug("[".concat(this._sessionId, "]: ").concat(currentVod_1.getPlayheadPositions()));
                        debug("[".concat(this._sessionId, "]: msequences=").concat(currentVod_1.getLiveMediaSequencesCount()));
                        cloudWatchLog(!this.cloudWatchLogging, "engine-session", { event: "switchback", channel: this._sessionId, reqTimeMs: Date.now() - startTS });
                        return [2 /*return*/];
                    case 78:
                        debug("[".concat(this._sessionId, "]: not a leader so will go directly to state VOD_RELOAD_INITIATING"));
                        _t = sessionState;
                        return [4 /*yield*/, this._sessionState.set("state", SessionState.VOD_RELOAD_INITIATING)];
                    case 79:
                        _t.state = _u.sent();
                        _u.label = 80;
                    case 80: return [3 /*break*/, 82];
                    case 81:
                        err_6 = _u.sent();
                        debug("Failed to init reload vod");
                        throw err_6;
                    case 82: return [3 /*break*/, 88];
                    case 83:
                        debug("[".concat(this._sessionId, "]: state=VOD_RELOAD_INITIATING (").concat(sessionState.vodMediaSeqVideo, "_").concat(sessionState.vodMediaSeqAudio, "_").concat(sessionState.vodMediaSeqSubtitle, ", ").concat(currentVod.getLiveMediaSequencesCount(), "_").concat(currentVod.getLiveMediaSequencesCount("audio"), "_").concat(currentVod.getLiveMediaSequencesCount("subtitle"), ")"));
                        if (!!isLeader) return [3 /*break*/, 86];
                        debug("[".concat(this._sessionId, "]: not the leader so just waiting for the VOD to be reloaded"));
                        if (!(sessionState.vodMediaSeqVideo === 0 || this.waitingForNextVod)) return [3 /*break*/, 85];
                        debug("[".concat(this._sessionId, "]: First mediasequence in VOD and I am not the leader so invalidate current VOD cache and fetch the new one from the leader"));
                        return [4 /*yield*/, this._sessionState.clearCurrentVodCache()];
                    case 84:
                        _u.sent();
                        _u.label = 85;
                    case 85:
                        this.waitingForNextVod = true;
                        _u.label = 86;
                    case 86:
                        // Allow Leader|Follower to clear vodCache...
                        this.isAllowedToClearVodCache = true;
                        return [2 /*return*/];
                    case 87: throw new Error("Invalid state: " + sessionState.state);
                    case 88: return [2 /*return*/];
                }
            });
        });
    };
    Session.prototype._getNextVod = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var nextVodPromise;
            nextVodPromise = _this._assetManager.getNextVod({
                sessionId: _this._sessionId,
                category: _this._category,
                playlistId: _this._sessionId
            });
            nextVodPromise.then(function (nextVod) {
                if (nextVod && nextVod.uri) {
                    _this.currentMetadata = {
                        id: nextVod.id,
                        title: nextVod.title || '',
                    };
                    resolve(nextVod);
                }
                else if (nextVod && nextVod.type === 'gap') {
                    _this.currentMetadata = {
                        id: 'GAP',
                        title: 'GAP of ' + Math.floor(nextVod.desiredDuration) + ' sec',
                    };
                    resolve(nextVod);
                }
                else {
                    console.error("Invalid VOD:", nextVod);
                    reject("Invalid VOD from asset manager");
                }
            })
                .catch(reject);
        });
    };
    Session.prototype._loadSlate = function (afterVod, reps) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                var slateVod_1 = new HLSRepeatVod(_this.slateUri, reps || _this.slateRepetitions);
                var hlsVod_1;
                slateVod_1.load()
                    .then(function () {
                    var hlsOpts = { sequenceAlwaysContainNewSegments: _this.alwaysNewSegments,
                        forcedDemuxMode: _this.use_demuxed_audio,
                        dummySubtitleEndpoint: _this.dummySubtitleEndpoint,
                        subtitleSliceEndpoint: _this.subtitleSliceEndpoint,
                        shouldContainSubtitles: _this.use_vtt_subtitles,
                        expectedSubtitleTracks: _this._subtitleTracks,
                        alwaysMapBandwidthByNearest: _this.alwaysMapBandwidthByNearest,
                        skipSerializeMediaSequences: _this.partialStoreHLSVod
                    };
                    var timestamp = Date.now();
                    hlsVod_1 = new HLSVod(_this.slateUri, null, timestamp, null, m3u8Header(_this._instanceId), hlsOpts);
                    hlsVod_1.addMetadata('id', "slate-".concat(timestamp));
                    hlsVod_1.addMetadata('start-date', new Date(timestamp).toISOString());
                    hlsVod_1.addMetadata('planned-duration', ((reps || _this.slateRepetitions) * _this.slateDuration) / 1000);
                    var slateMediaManifestLoader = function (bw) {
                        var mediaManifestStream = new Readable();
                        mediaManifestStream.push(slateVod_1.getMediaManifest(bw));
                        mediaManifestStream.push(null);
                        return mediaManifestStream;
                    };
                    if (_this.use_demuxed_audio) {
                        var slateAudioManifestLoader = function (audioGroupId, audioLanguage) {
                            var mediaManifestStream = new Readable();
                            mediaManifestStream.push(slateVod_1.getAudioManifest(audioGroupId, audioLanguage));
                            mediaManifestStream.push(null);
                            return mediaManifestStream;
                        };
                        if (afterVod) {
                            return hlsVod_1.loadAfter(afterVod, null, slateMediaManifestLoader, slateAudioManifestLoader);
                        }
                        else {
                            return hlsVod_1.load(null, slateMediaManifestLoader, slateAudioManifestLoader);
                        }
                    }
                    else {
                        if (afterVod) {
                            return hlsVod_1.loadAfter(afterVod, null, slateMediaManifestLoader);
                        }
                        else {
                            return hlsVod_1.load(null, slateMediaManifestLoader);
                        }
                    }
                })
                    .then(function () {
                    resolve(hlsVod_1);
                })
                    .catch(function (err) {
                    debug(err);
                    reject(err);
                });
            }
            catch (err) {
                reject(err);
            }
        });
    };
    Session.prototype._truncateVod = function (vodResponse) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                var options = {};
                if (vodResponse.startOffset) {
                    options.offset = vodResponse.startOffset / 1000;
                }
                var truncatedVod_1 = new HLSTruncateVod(vodResponse.uri, vodResponse.desiredDuration / 1000, options);
                truncatedVod_1.load()
                    .then(function () {
                    var audioManifestLoader;
                    var mediaManifestLoader = function (bw) {
                        var mediaManifestStream = new Readable();
                        mediaManifestStream.push(truncatedVod_1.getMediaManifest(bw));
                        mediaManifestStream.push(null);
                        return mediaManifestStream;
                    };
                    if (_this.use_demuxed_audio) {
                        audioManifestLoader = function (audioGroupId, audioLanguage) {
                            var mediaManifestStream = new Readable();
                            mediaManifestStream.push(truncatedVod_1.getAudioManifest(audioGroupId, audioLanguage));
                            mediaManifestStream.push(null);
                            return mediaManifestStream;
                        };
                    }
                    resolve({ mediaManifestLoader: mediaManifestLoader, audioManifestLoader: audioManifestLoader });
                }).catch(function (err) {
                    debug(err);
                    reject(err);
                });
            }
            catch (err) {
                reject(err);
            }
        });
    };
    Session.prototype._truncateSlate = function (afterVod, requestedDuration, vodUri) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var nexVodUri = null;
            try {
                if (vodUri) {
                    nexVodUri = vodUri;
                }
                else {
                    nexVodUri = _this.slateUri;
                }
                // if (vodResponse.startOffset) {
                //   options.offset = vodResponse.startOffset / 1000;
                // }
                console.log('requestedDuration', requestedDuration);
                var slateVod_2 = new HLSTruncateVod(nexVodUri, requestedDuration, { offset: 0 });
                var hlsVod_2;
                slateVod_2.load()
                    .then(function () {
                    var hlsOpts = {
                        sequenceAlwaysContainNewSegments: _this.alwaysNewSegments,
                        forcedDemuxMode: _this.use_demuxed_audio,
                        dummySubtitleEndpoint: _this.dummySubtitleEndpoint,
                        subtitleSliceEndpoint: _this.subtitleSliceEndpoint,
                        shouldContainSubtitles: _this.use_vtt_subtitles,
                        expectedSubtitleTracks: _this._subtitleTracks,
                        alwaysMapBandwidthByNearest: _this.alwaysMapBandwidthByNearest,
                        skipSerializeMediaSequences: _this.partialStoreHLSVod
                    };
                    var timestamp = Date.now();
                    hlsVod_2 = new HLSVod(nexVodUri, null, timestamp, null, m3u8Header(_this._instanceId), hlsOpts);
                    hlsVod_2.addMetadata('id', "slate-".concat(timestamp));
                    hlsVod_2.addMetadata('start-date', new Date(timestamp).toISOString());
                    hlsVod_2.addMetadata('planned-duration', requestedDuration);
                    var slateMediaManifestLoader = function (bw) {
                        var mediaManifestStream = new Readable();
                        mediaManifestStream.push(slateVod_2.getMediaManifest(bw));
                        mediaManifestStream.push(null);
                        return mediaManifestStream;
                    };
                    if (_this.use_demuxed_audio) {
                        var slateAudioManifestLoader = function (audioGroupId, audioLanguage) {
                            var mediaManifestStream = new Readable();
                            mediaManifestStream.push(slateVod_2.getAudioManifest(audioGroupId, audioLanguage));
                            mediaManifestStream.push(null);
                            return mediaManifestStream;
                        };
                        if (afterVod) {
                            return hlsVod_2.loadAfter(afterVod, null, slateMediaManifestLoader, slateAudioManifestLoader);
                        }
                        else {
                            return hlsVod_2.load(null, slateMediaManifestLoader, slateAudioManifestLoader);
                        }
                    }
                    else {
                        if (afterVod) {
                            return hlsVod_2.loadAfter(afterVod, null, slateMediaManifestLoader);
                        }
                        else {
                            return hlsVod_2.load(null, slateMediaManifestLoader);
                        }
                    }
                })
                    .then(function () {
                    resolve(hlsVod_2);
                })
                    .catch(function (err) {
                    debug(err);
                    reject(err);
                });
            }
            catch (err) {
                reject(err);
            }
        });
    };
    Session.prototype._truncateSlateWithOptions = function (afterVod, requestedDuration, vodUri, options) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var nexVodUri = null;
            try {
                if (vodUri) {
                    nexVodUri = vodUri;
                }
                else {
                    nexVodUri = _this.slateUri;
                }
                if (options.startOffset) {
                    options.offset = options.startOffset / 1000;
                }
                console.log('requestedDuration', requestedDuration, options);
                var slateVod_3 = new HLSTruncateVod(nexVodUri, requestedDuration, options);
                var hlsVod_3;
                slateVod_3.load()
                    .then(function () {
                    var hlsOpts = {
                        sequenceAlwaysContainNewSegments: _this.alwaysNewSegments,
                        forcedDemuxMode: _this.use_demuxed_audio,
                        dummySubtitleEndpoint: _this.dummySubtitleEndpoint,
                        subtitleSliceEndpoint: _this.subtitleSliceEndpoint,
                        shouldContainSubtitles: _this.use_vtt_subtitles,
                        expectedSubtitleTracks: _this._subtitleTracks,
                        alwaysMapBandwidthByNearest: _this.alwaysMapBandwidthByNearest,
                        skipSerializeMediaSequences: _this.partialStoreHLSVod
                    };
                    var timestamp = Date.now();
                    hlsVod_3 = new HLSVod(nexVodUri, null, timestamp, null, m3u8Header(_this._instanceId), hlsOpts);
                    hlsVod_3.addMetadata('id', "slate-".concat(timestamp));
                    hlsVod_3.addMetadata('start-date', new Date(timestamp).toISOString());
                    hlsVod_3.addMetadata('planned-duration', requestedDuration);
                    var slateMediaManifestLoader = function (bw) {
                        var mediaManifestStream = new Readable();
                        mediaManifestStream.push(slateVod_3.getMediaManifest(bw));
                        mediaManifestStream.push(null);
                        return mediaManifestStream;
                    };
                    if (_this.use_demuxed_audio) {
                        var slateAudioManifestLoader = function (audioGroupId, audioLanguage) {
                            var mediaManifestStream = new Readable();
                            mediaManifestStream.push(slateVod_3.getAudioManifest(audioGroupId, audioLanguage));
                            mediaManifestStream.push(null);
                            return mediaManifestStream;
                        };
                        if (afterVod) {
                            return hlsVod_3.loadAfter(afterVod, null, slateMediaManifestLoader, slateAudioManifestLoader);
                        }
                        else {
                            return hlsVod_3.load(null, slateMediaManifestLoader, slateAudioManifestLoader);
                        }
                    }
                    else {
                        if (afterVod) {
                            return hlsVod_3.loadAfter(afterVod, null, slateMediaManifestLoader);
                        }
                        else {
                            return hlsVod_3.load(null, slateMediaManifestLoader);
                        }
                    }
                })
                    .then(function () {
                    resolve(hlsVod_3);
                })
                    .catch(function (err) {
                    debug(err);
                    reject(err);
                });
            }
            catch (err) {
                reject(err);
            }
        });
    };
    Session.prototype._fillGap = function (afterVod, desiredDuration) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var loadSlatePromise;
            var durationMs;
            if (desiredDuration > _this.slateDuration) {
                var reps = Math.floor(desiredDuration / _this.slateDuration);
                debug("[".concat(_this._sessionId, "]: Trying to fill a gap of ").concat(desiredDuration, " milliseconds (").concat(reps, " repetitions)"));
                loadSlatePromise = _this._loadSlate(afterVod, reps);
                durationMs = (reps || _this.slateRepetitions) * _this.slateDuration;
            }
            else {
                debug("[".concat(_this._sessionId, "]: Trying to fill a gap of ").concat(desiredDuration, " milliseconds by truncating filler slate (").concat(_this.slateDuration, ")"));
                loadSlatePromise = _this._truncateSlate(afterVod, desiredDuration / 1000);
                durationMs = desiredDuration;
            }
            loadSlatePromise.then(function (hlsVod) {
                cloudWatchLog(!_this.cloudWatchLogging, 'engine-session', { event: 'filler', channel: _this._sessionId, durationMs: durationMs });
                resolve(hlsVod);
            }).catch(reject);
        });
    };
    Session.prototype._getNextVodById = function (id) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this._assetManager.getNextVodById(_this._sessionId, id)
                .then(function (nextVod) {
                //debug(nextVod);
                _this.currentMetadata = {
                    id: nextVod.id,
                    title: nextVod.title || '',
                };
                resolve(nextVod);
            })
                .catch(reject);
        });
    };
    Session.prototype._getFirstDuration = function (manifest) {
        return new Promise(function (resolve, reject) {
            try {
                var parser = m3u8.createStream();
                var manifestStream = new Readable();
                manifestStream.push(manifest);
                manifestStream.push(null);
                manifestStream.pipe(parser);
                parser.on('m3u', function (m3u) {
                    if (m3u.items.PlaylistItem[0]) {
                        var firstDuration = m3u.items.PlaylistItem[0].get("duration");
                        resolve(firstDuration);
                    }
                    else {
                        console.error("Empty media playlist");
                        console.error(manifest);
                        reject('Empty media playlist!');
                    }
                });
            }
            catch (err) {
                reject(err);
            }
        });
    };
    Session.prototype._getCurrentDeltaTime = function () {
        return __awaiter(this, void 0, void 0, function () {
            var sessionState, currentVod, deltaTimes;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._sessionState.getValues(["vodMediaSeqVideo"])];
                    case 1:
                        sessionState = _a.sent();
                        return [4 /*yield*/, this._sessionState.getCurrentVod()];
                    case 2:
                        currentVod = _a.sent();
                        deltaTimes = currentVod.getDeltaTimes();
                        debug("[".concat(this._sessionId, "]: Current delta time (").concat(sessionState.vodMediaSeqVideo, "): ").concat(deltaTimes[sessionState.vodMediaSeqVideo]));
                        if (deltaTimes[sessionState.vodMediaSeqVideo]) {
                            return [2 /*return*/, deltaTimes[sessionState.vodMediaSeqVideo]];
                        }
                        return [2 /*return*/, 0];
                }
            });
        });
    };
    Session.prototype._getCurrentPlayheadPosition = function () {
        return __awaiter(this, void 0, void 0, function () {
            var sessionState, currentVod, playheadPositions;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._sessionState.getValues(["vodMediaSeqVideo"])];
                    case 1:
                        sessionState = _a.sent();
                        return [4 /*yield*/, this._sessionState.getCurrentVod()];
                    case 2:
                        currentVod = _a.sent();
                        playheadPositions = currentVod.getPlayheadPositions();
                        debug("[".concat(this._sessionId, "]: Current playhead position (").concat(sessionState.vodMediaSeqVideo, "): ").concat(playheadPositions[sessionState.vodMediaSeqVideo]));
                        return [2 /*return*/, playheadPositions[sessionState.vodMediaSeqVideo]];
                }
            });
        });
    };
    Session.prototype._getAudioPlayheadPosition = function (seqIdx) {
        return __awaiter(this, void 0, void 0, function () {
            var currentVod, playheadPositions;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._sessionState.getCurrentVod()];
                    case 1:
                        currentVod = _a.sent();
                        playheadPositions = currentVod.getPlayheadPositions("audio");
                        if (seqIdx >= playheadPositions.length - 1) {
                            seqIdx = playheadPositions.length - 1;
                        }
                        debug("[".concat(this._sessionId, "]: Current audio playhead position (").concat(seqIdx, "): ").concat(playheadPositions[seqIdx]));
                        return [2 /*return*/, playheadPositions[seqIdx]];
                }
            });
        });
    };
    Session.prototype._getSubtitlePlayheadPosition = function (seqIdx) {
        return __awaiter(this, void 0, void 0, function () {
            var currentVod, playheadPositions;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._sessionState.getCurrentVod()];
                    case 1:
                        currentVod = _a.sent();
                        playheadPositions = currentVod.getPlayheadPositions("subtitle");
                        if (seqIdx >= playheadPositions.length - 1) {
                            seqIdx = playheadPositions.length - 1;
                        }
                        debug("[".concat(this._sessionId, "]: Current subtitle playhead position (").concat(seqIdx, "): ").concat(playheadPositions[seqIdx]));
                        return [2 /*return*/, playheadPositions[seqIdx]];
                }
            });
        });
    };
    Session.prototype._getLastDuration = function (manifest) {
        return new Promise(function (resolve, reject) {
            try {
                var parser = m3u8.createStream();
                var manifestStream = new Readable();
                manifestStream.push(manifest);
                manifestStream.push(null);
                manifestStream.pipe(parser);
                parser.on('m3u', function (m3u) {
                    if (m3u.items.PlaylistItem.length > 0) {
                        var endIdx = m3u.items.PlaylistItem.length - 1;
                        var bottomDuration = m3u.items.PlaylistItem[endIdx].get("duration");
                        resolve(bottomDuration);
                    }
                    else {
                        console.error("Empty media playlist");
                        console.error(manifest);
                        reject('Empty media playlist!');
                    }
                });
            }
            catch (err) {
                reject(err);
            }
        });
    };
    Session.prototype._getPlayheadDiffCompensationValue = function (diffMs, thresholdMs) {
        var compensationSec = 0;
        if (diffMs > thresholdMs) {
            compensationSec = (diffMs / 1000) - (thresholdMs / 1000);
            debug("[".concat(this._sessionId, "]: Playhead stepping msequences too early. Need to wait longer. adding ").concat(compensationSec, "s"));
            return compensationSec;
        }
        else if (diffMs < -thresholdMs) {
            compensationSec = (diffMs / 1000) + (thresholdMs / 1000);
            debug("[".concat(this._sessionId, "]: Playhead stepping msequences too LATE. Need to fast-forward. adding ").concat(compensationSec, "s"));
            return compensationSec;
        }
        else {
            return compensationSec;
        }
    };
    Session.prototype._isOldVod = function (refTs, vodDur) {
        var VOD_DURATION_MS = vodDur * 1000;
        var TIME_PADDING_MS = VOD_DURATION_MS * 0.05; //5 percent of content duration
        var TIME_SINCE_VOD_STARTED_MS = Date.now() - refTs + TIME_PADDING_MS;
        if (TIME_SINCE_VOD_STARTED_MS > VOD_DURATION_MS) {
            return true;
        }
        return false;
    };
    Session.prototype._determineExtraMediaIncrement = function (_extraType, _currentPosVideo, _extraSeqFinalIndex, _vodMediaSeqExtra, _getExtraPlayheadPositionAsyncFn) {
        return __awaiter(this, void 0, void 0, function () {
            var extraMediaIncrement, positionV, positionX, posDiff, threshold, currentPosExtraMedia, difference;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        debug("[".concat(this._sessionId, "]: About to determine ").concat(_extraType, " increment. Video increment has already been executed."));
                        extraMediaIncrement = 0;
                        positionV = _currentPosVideo ? _currentPosVideo / 1000 : 0;
                        threshold = 0.500;
                        _a.label = 1;
                    case 1:
                        if (!(extraMediaIncrement < _extraSeqFinalIndex)) return [3 /*break*/, 3];
                        return [4 /*yield*/, _getExtraPlayheadPositionAsyncFn(_vodMediaSeqExtra + extraMediaIncrement)];
                    case 2:
                        currentPosExtraMedia = (_a.sent()) * 1000;
                        positionX = currentPosExtraMedia ? currentPosExtraMedia / 1000 : 0;
                        posDiff = (positionV - positionX).toFixed(3);
                        debug("[".concat(this._sessionId, "]: positionV=").concat(positionV, ";position").concat(_extraType === "audio" ? "A" : "S", "=").concat(positionX, ";posDiff=").concat(posDiff));
                        if (isNaN(posDiff)) {
                            return [3 /*break*/, 3];
                        }
                        if (positionX >= positionV) {
                            return [3 /*break*/, 3];
                        }
                        difference = Math.abs(posDiff);
                        if (difference > threshold && difference > Number.EPSILON) {
                            // Video position ahead of audio|sub position, further increment needed...
                            extraMediaIncrement++;
                        }
                        else {
                            debug("[".concat(this._sessionId, "]: Difference(").concat(difference, ") is acceptable; IncrementValue=").concat(extraMediaIncrement));
                            return [3 /*break*/, 3];
                        }
                        return [3 /*break*/, 1];
                    case 3: return [2 /*return*/, {
                            increment: extraMediaIncrement,
                            position: positionX,
                            diff: posDiff
                        }];
                }
            });
        });
    };
    Session.prototype._getM3u8File = function (variantType, variantKey, playbackSessionId) {
        return __awaiter(this, void 0, void 0, function () {
            var tries, delayMs, MSDKeys, currentVod, sessionState, playheadState, state, DELAY_TIME_MS, ACTION, isLeader, diffMs, manifestMseq, manifestDseq, mediaSequenceValue, m3u8_2, parsedGroupId, parsedLang, data, data, err_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        tries = 12;
                        _a.label = 1;
                    case 1:
                        if (!(tries > 0 && this.leaderIsSettingNextVod)) return [3 /*break*/, 3];
                        delayMs = 250;
                        debug("[".concat(this._sessionId, "]: Leader is setting the next vod. Waiting ").concat(delayMs, "ms_").concat(tries));
                        return [4 /*yield*/, timer(delayMs)];
                    case 2:
                        _a.sent();
                        tries--;
                        return [3 /*break*/, 1];
                    case 3:
                        MSDKeys = {
                            mediaSeq: null,
                            vodMediaSeq: null,
                            discSeq: null
                        };
                        if (variantType === "video") {
                            MSDKeys.mediaSeq = "mediaSeq";
                            MSDKeys.vodMediaSeq = "vodMediaSeqVideo";
                            MSDKeys.discSeq = "discSeq";
                        }
                        else if (variantType === "audio") {
                            MSDKeys.mediaSeq = "mediaSeqAudio";
                            MSDKeys.vodMediaSeq = "vodMediaSeqAudio";
                            MSDKeys.discSeq = "discSeqAudio";
                        }
                        else if (variantType === "subtitle") {
                            MSDKeys.mediaSeq = "mediaSeqSubtitle";
                            MSDKeys.vodMediaSeq = "vodMediaSeqSubtitle";
                            MSDKeys.discSeq = "discSeqSubtitle";
                        }
                        currentVod = null;
                        return [4 /*yield*/, this._sessionState.getValues([MSDKeys.vodMediaSeq, MSDKeys.discSeq])];
                    case 4:
                        sessionState = _a.sent();
                        return [4 /*yield*/, this._playheadState.getValues([MSDKeys.mediaSeq, MSDKeys.vodMediaSeq, "playheadRef"])];
                    case 5:
                        playheadState = _a.sent();
                        if (this.prevVodMediaSeq[variantType] === null) {
                            this.prevVodMediaSeq[variantType] = playheadState[MSDKeys.vodMediaSeq];
                        }
                        if (this.prevMediaSeqOffset[variantType] === null) {
                            this.prevMediaSeqOffset[variantType] = playheadState[MSDKeys.mediaSeq];
                        }
                        if (!(playheadState[MSDKeys.vodMediaSeq] > sessionState[MSDKeys.vodMediaSeq] ||
                            (playheadState[MSDKeys.vodMediaSeq] < sessionState[MSDKeys.vodMediaSeq] &&
                                playheadState[MSDKeys.mediaSeq] === this.prevMediaSeqOffset[variantType]))) return [3 /*break*/, 9];
                        return [4 /*yield*/, this._sessionState.get("state")];
                    case 6:
                        state = _a.sent();
                        DELAY_TIME_MS = 1000;
                        ACTION = [SessionState.VOD_RELOAD_INIT, SessionState.VOD_RELOAD_INITIATING].includes(state) ? "Reloaded" : "Loaded Next";
                        debug("[".concat(this._sessionId, "]: Recently ").concat(ACTION, " Vod. PlayheadState not up-to-date (").concat(playheadState[MSDKeys.vodMediaSeq], "_").concat(sessionState[MSDKeys.vodMediaSeq], "). Waiting ").concat(DELAY_TIME_MS, "ms before reading from store again (").concat(variantType, ")"));
                        return [4 /*yield*/, timer(DELAY_TIME_MS)];
                    case 7:
                        _a.sent();
                        return [4 /*yield*/, this._playheadState.getValues([MSDKeys.mediaSeq, MSDKeys.vodMediaSeq])];
                    case 8:
                        playheadState = _a.sent();
                        _a.label = 9;
                    case 9:
                        if (!(variantType === "video")) return [3 /*break*/, 15];
                        if (!(playheadState.vodMediaSeqVideo < 2 || playheadState.mediaSeq !== this.prevMediaSeqOffset.video)) return [3 /*break*/, 14];
                        debug("[".concat(this._sessionId, "]: current[").concat(playheadState.vodMediaSeqVideo, "]_prev[").concat(this.prevVodMediaSeq.video, "]"));
                        debug("[".concat(this._sessionId, "]: current-offset[").concat(playheadState.mediaSeq, "]_prev-offset[").concat(this.prevMediaSeqOffset.video, "]"));
                        // If true, then we have not updated the prev-values and not cleared the cache yet.
                        if (playheadState.vodMediaSeqVideo < this.prevVodMediaSeq.video || playheadState.mediaSeq !== this.prevMediaSeqOffset.video) {
                            this.isAllowedToClearVodCache = true;
                        }
                        return [4 /*yield*/, this._sessionStateStore.isLeader(this._instanceId)];
                    case 10:
                        isLeader = _a.sent();
                        if (!(!isLeader && this.isAllowedToClearVodCache)) return [3 /*break*/, 13];
                        debug("[".concat(this._sessionId, "]: Not a leader and first|second media sequence in a VOD is requested. Invalidate cache to ensure having the correct VOD."));
                        return [4 /*yield*/, this._sessionState.clearCurrentVodCache()];
                    case 11:
                        _a.sent();
                        this.isAllowedToClearVodCache = false;
                        return [4 /*yield*/, this._playheadState.get("diffCompensation")];
                    case 12:
                        diffMs = _a.sent();
                        if (diffMs) {
                            this.diffCompensation = diffMs;
                            debug("[".concat(this._sessionId, "]: Setting diffCompensation->").concat(this.diffCompensation));
                            if (this.diffCompensation) {
                                this.timePositionOffset = this.diffCompensation;
                                cloudWatchLog(!this.cloudWatchLogging, "engine-session", {
                                    event: "timePositionOffsetUpdated",
                                    channel: this._sessionId,
                                    offsetMs: this.timePositionOffset,
                                });
                            }
                            else {
                                this.timePositionOffset = 0;
                            }
                        }
                        _a.label = 13;
                    case 13: return [3 /*break*/, 15];
                    case 14:
                        this.isAllowedToClearVodCache = true;
                        _a.label = 15;
                    case 15: return [4 /*yield*/, this._sessionState.getCurrentVod()];
                    case 16:
                        currentVod = _a.sent();
                        if (!currentVod) return [3 /*break*/, 24];
                        if (!(playheadState[MSDKeys.vodMediaSeq] < 2 || playheadState[MSDKeys.mediaSeq] !== this.prevMediaSeqOffset.video)) return [3 /*break*/, 20];
                        if (!(playheadState.playheadRef > this.currentPlayheadRef)) return [3 /*break*/, 20];
                        return [4 /*yield*/, timer(500)];
                    case 17:
                        _a.sent();
                        this.currentPlayheadRef = playheadState.playheadRef;
                        debug("[".concat(this._sessionId, "]: While requesting ").concat(variantType, " manifest for ").concat(variantKey, ", (mseq=").concat(playheadState[MSDKeys.vodMediaSeq], ")"));
                        return [4 /*yield*/, this._sessionState.clearCurrentVodCache()];
                    case 18:
                        _a.sent(); // force reading up from shared store
                        return [4 /*yield*/, this._sessionState.getCurrentVod()];
                    case 19:
                        currentVod = _a.sent();
                        _a.label = 20;
                    case 20:
                        _a.trys.push([20, 21, , 23]);
                        manifestMseq = playheadState[MSDKeys.mediaSeq] + playheadState[MSDKeys.vodMediaSeq];
                        manifestDseq = sessionState[MSDKeys.discSeq] + this._getCurrentVodData("discontinuities", variantType, currentVod)[playheadState[MSDKeys.vodMediaSeq]];
                        if (currentVod.sequenceAlwaysContainNewSegments) {
                            mediaSequenceValue = this._getCurrentVodData("mseqValues", variantType, currentVod)[playheadState[MSDKeys.vodMediaSeq]];
                            debug("[".concat(this._sessionId, "]: {").concat(mediaSequenceValue, "}_{").concat(this._getCurrentVodData("finalMseqValue", variantType, currentVod), "}"));
                            manifestMseq = playheadState[MSDKeys.mediaSeq] + mediaSequenceValue;
                        }
                        debug("[".concat(this._sessionId, "]: [").concat(playheadState[MSDKeys.vodMediaSeq], "]_[").concat(this._getCurrentVodData("mseqCount", variantType, currentVod), "]"));
                        parsedGroupId = void 0;
                        parsedLang = void 0;
                        if (variantType === "video") {
                            m3u8_2 = currentVod.getLiveMediaSequences(playheadState[MSDKeys.mediaSeq], variantKey, playheadState[MSDKeys.vodMediaSeq], sessionState[MSDKeys.discSeq], this.targetDurationPadding, this.forceTargetDuration);
                        }
                        else if ((variantType === "audio")) {
                            data = JSON.parse(variantKey);
                            parsedGroupId = data.groupId;
                            parsedLang = data.lang;
                            m3u8_2 = currentVod.getLiveMediaAudioSequences(playheadState[MSDKeys.mediaSeq], parsedGroupId, parsedLang, playheadState[MSDKeys.vodMediaSeq], sessionState[MSDKeys.discSeq], this.targetDurationPadding, this.forceTargetDuration);
                        }
                        else if (variantType === "subtitle") {
                            data = JSON.parse(variantKey);
                            parsedGroupId = data.groupId;
                            parsedLang = data.lang;
                            m3u8_2 = currentVod.getLiveMediaSubtitleSequences(playheadState[MSDKeys.mediaSeq], parsedGroupId, parsedLang, playheadState[MSDKeys.vodMediaSeq], sessionState[MSDKeys.discSeq], this.targetDurationPadding, this.forceTargetDuration);
                        }
                        debug("[".concat(this._sessionId, "]:").concat(playbackSessionId ? "[".concat(playbackSessionId, "]:") : "", " [").concat(manifestMseq, "][").concat(manifestDseq, "][+").concat(this.targetDurationPadding || 0, "] Current ").concat(variantType, " manifest for ").concat(variantType === "video" ? variantKey : "".concat(parsedGroupId, "_").concat(parsedLang), " requested"));
                        this.prevVodMediaSeq[variantType] = playheadState[MSDKeys.vodMediaSeq];
                        this.prevMediaSeqOffset[variantType] = playheadState[MSDKeys.mediaSeq];
                        return [2 /*return*/, m3u8_2];
                    case 21:
                        err_7 = _a.sent();
                        logerror(this._sessionId, err_7);
                        return [4 /*yield*/, this._sessionState.clearCurrentVodCache()];
                    case 22:
                        _a.sent(); // force reading up from shared store
                        throw new Error("Failed to generate manifest: " + JSON.stringify(playheadState));
                    case 23: return [3 /*break*/, 25];
                    case 24: throw new Error("Engine not ready");
                    case 25: return [2 /*return*/];
                }
            });
        });
    };
    Session.prototype._getCurrentVodData = function (dataName, variantType, vod) {
        switch (dataName) {
            case "discontinuities":
                if (variantType === "video")
                    return vod.discontinuities;
                if (variantType === "audio")
                    return vod.discontinuitiesAudio;
                if (variantType === "subtitle")
                    return vod.discontinuitiesSubtitle;
            case "mseqValues":
                if (variantType === "video")
                    return vod.mediaSequenceValues;
                if (variantType === "audio")
                    return vod.mediaSequenceValuesAudio;
                if (variantType === "subtitle")
                    return vod.mediaSequenceValuesSubtitle;
            case "finalMseqValue":
                if (variantType === "video")
                    return vod.getLastSequenceMediaSequenceValue();
                if (variantType === "audio")
                    return vod.getLastSequenceMediaSequenceValueAudio();
                if (variantType === "subtitle")
                    return vod.getLastSequenceMediaSequenceValueSubtitle();
            case "mseqCount":
                if (variantType === "video")
                    return vod.getLiveMediaSequencesCount();
                if (variantType === "audio")
                    return vod.getLiveMediaSequencesCount("audio");
                if (variantType === "subtitle")
                    return vod.getLiveMediaSequencesCount("subtitle");
            default:
                console.log("WARNING! dataName:".concat(dataName, " is not valid"));
        }
    };
    return Session;
}());
module.exports = Session;
