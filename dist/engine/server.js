"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChannelEngine = exports.ScheduleStreamType = void 0;
var restify = require('restify');
var errs = require('restify-errors');
var uuidv4 = require('uuid').v4;
var debug = require('debug')('engine-server');
var verbose = require('debug')('engine-server-verbose');
var Session = require('./session.js');
var SessionLive = require('./session_live.js');
var StreamSwitcher = require('./stream_switcher.js');
var EventStream = require('./event_stream.js');
var SubtitleSlicer = require('./subtitle_slicer.js');
var timer = require('./util.js').timer;
var SessionStateStore = require('./session_state.js').SessionStateStore;
var SessionLiveStateStore = require('./session_live_state.js').SessionLiveStateStore;
var PlayheadStateStore = require('./playhead_state.js').PlayheadStateStore;
var _a = require('./util.js'), filterQueryParser = _a.filterQueryParser, toHHMMSS = _a.toHHMMSS, WaitTimeGenerator = _a.WaitTimeGenerator;
var preflight = require('./preflight.js');
var version = require('../package.json').version;
var AUTO_CREATE_CHANNEL_TIMEOUT = 3000;
var sessions = {}; // Should be a persistent store...
var sessionsLive = {}; // Should be a persistent store...
var sessionSwitchers = {}; // Should be a persistent store...
var switcherStatus = {}; // Should be a persistent store...
var eventStreams = {};
var DefaultDummySubtitleEndpointPath = "/dummyUrl";
var DefaultSubtitleSpliceEndpointPath = "/sliceUrl";
var ScheduleStreamType;
(function (ScheduleStreamType) {
    ScheduleStreamType[ScheduleStreamType["LIVE"] = 1] = "LIVE";
    ScheduleStreamType[ScheduleStreamType["VOD"] = 2] = "VOD";
})(ScheduleStreamType = exports.ScheduleStreamType || (exports.ScheduleStreamType = {}));
;
var ChannelEngine = /** @class */ (function () {
    function ChannelEngine(assetMgr, options) {
        var _this = this;
        this.autoCreateSession = false;
        this.sessionResetKey = "";
        this.sessionEventStream = false;
        this.sessionHealthKey = "";
        this.options = options;
        if (options && options.adCopyMgrUri) {
            this.adCopyMgrUri = options.adCopyMgrUri;
        }
        if (options && options.adXchangeUri) {
            this.adXchangeUri = options.adXchangeUri;
        }
        this.useDemuxedAudio = false;
        if (options && options.useDemuxedAudio) {
            this.useDemuxedAudio = true;
        }
        this.useVTTSubtitles = (options && options.useVTTSubtitles) ? options.useVTTSubtitles : false;
        var vttBasePath = (options && options.vttBasePath) ? options.vttBasePath : '/vtt';
        this.dummySubtitleEndpoint = (options && options.dummySubtitleEndpoint) ? options.dummySubtitleEndpoint : vttBasePath + DefaultDummySubtitleEndpointPath;
        this.subtitleSliceEndpoint = (options && options.subtitleSliceEndpoint) ? options.subtitleSliceEndpoint : vttBasePath + DefaultSubtitleSpliceEndpointPath;
        this.sessionResetKey = "";
        if (options && options.sessionResetKey) {
            this.sessionResetKey = options.sessionResetKey;
        }
        if (options && options.sessionHealthKey) {
            this.sessionHealthKey = options.sessionHealthKey;
        }
        this.alwaysNewSegments = false;
        if (options && options.alwaysNewSegments) {
            this.alwaysNewSegments = true;
        }
        this.partialStoreHLSVod = false;
        if (options && options.partialStoreHLSVod) {
            this.partialStoreHLSVod = true;
        }
        this.alwaysMapBandwidthByNearest = false;
        if (options && options.alwaysMapBandwidthByNearest) {
            this.alwaysMapBandwidthByNearest = true;
        }
        if (options && options.defaultSlateUri) {
            this.defaultSlateUri = options.defaultSlateUri;
            this.slateRepetitions = options.slateRepetitions || 10;
            this.slateDuration = options.slateDuration || 4000;
        }
        if (options && options.streamSwitchManager) {
            this.streamSwitchManager = options.streamSwitchManager;
        }
        if (options && options.autoCreateSession !== undefined) {
            this.autoCreateSession = options.autoCreateSession;
        }
        this.assetMgr = assetMgr;
        this.monitorTimer = {};
        this.server = restify.createServer();
        if (options && options.keepAliveTimeout) {
            this.server.server.keepAliveTimeout = options.keepAliveTimeout;
            this.server.server.headersTimeout = options.keepAliveTimeout + 1000;
        }
        this.server.use(restify.plugins.queryParser());
        this.serverStartTime = Date.now();
        this.instanceId = uuidv4();
        this.streamSwitchTimeIntervalMs = 3000;
        this.sessionStore = {
            sessionStateStore: new SessionStateStore({
                redisUrl: options.redisUrl,
                memcachedUrl: options.memcachedUrl,
                cacheTTL: options.sharedStoreCacheTTL,
                volatileKeyTTL: options.volatileKeyTTL,
            }),
            playheadStateStore: new PlayheadStateStore({
                redisUrl: options.redisUrl,
                memcachedUrl: options.memcachedUrl,
                cacheTTL: options.sharedStoreCacheTTL,
                volatileKeyTTL: options.volatileKeyTTL,
            }),
            instanceId: this.instanceId,
        };
        this.sessionLiveStore = {
            sessionLiveStateStore: new SessionLiveStateStore({
                redisUrl: options.redisUrl,
                memcachedUrl: options.memcachedUrl,
                cacheTTL: options.sharedStoreCacheTTL,
                volatileKeyTTL: options.volatileKeyTTL,
            }),
            instanceId: this.instanceId,
        };
        if (options && options.staticDirectory) {
            this.server.get('/', restify.plugins.serveStatic({
                directory: options.staticDirectory,
                default: 'index.html'
            }));
        }
        this.streamerOpts = {};
        if (options && options.averageSegmentDuration) {
            this.streamerOpts.defaultAverageSegmentDuration = options.averageSegmentDuration;
        }
        if (options && options.cacheTTL) {
            this.streamerOpts.cacheTTL = options.cacheTTL;
        }
        this.logCloudWatchMetrics = false;
        if (options && options.cloudWatchMetrics) {
            this.logCloudWatchMetrics = true;
        }
        if (options && options.playheadDiffThreshold) {
            this.streamerOpts.defaultPlayheadDiffThreshold = options.playheadDiffThreshold;
        }
        if (options && options.maxTickInterval) {
            this.streamerOpts.defaultMaxTickInterval = options.maxTickInterval;
        }
        if (options && options.targetDurationPadding) {
            this.streamerOpts.targetDurationPadding = options.targetDurationPadding;
        }
        if (options && options.forceTargetDuration) {
            this.streamerOpts.forceTargetDuration = options.forceTargetDuration;
        }
        if (options && options.diffCompensationRate) {
            this.streamerOpts.diffCompensationRate = options.diffCompensationRate;
        }
        var handleMasterRoute = function (req, res, next) { return __awaiter(_this, void 0, void 0, function () {
            var m;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        debug(req.params);
                        if (!req.params.file.match(/master.m3u8/)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this._handleMasterManifest(req, res, next)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 8];
                    case 2:
                        if (!(m = req.params.file.match(/master(\d+).m3u8;session=(.*)$/))) return [3 /*break*/, 4];
                        req.params[0] = m[1];
                        req.params[1] = m[2];
                        return [4 /*yield*/, this._handleMediaManifest(req, res, next)];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 8];
                    case 4:
                        if (!(m = req.params.file.match(/master-(\S+)_(\S+).m3u8;session=(.*)$/))) return [3 /*break*/, 6];
                        req.params[0] = m[1];
                        req.params[1] = m[2];
                        req.params[2] = m[3];
                        return [4 /*yield*/, this._handleAudioManifest(req, res, next)];
                    case 5:
                        _a.sent();
                        return [3 /*break*/, 8];
                    case 6:
                        if (!(m = req.params.file.match(/subtitles-(\S+)_(\S+).m3u8;session=(.*)$/))) return [3 /*break*/, 8];
                        req.params[0] = m[1];
                        req.params[1] = m[2];
                        req.params[2] = m[3];
                        return [4 /*yield*/, this._handleSubtitleManifest(req, res, next)];
                    case 7:
                        _a.sent();
                        _a.label = 8;
                    case 8: return [2 /*return*/];
                }
            });
        }); };
        this.server.get('/live/:file', function (req, res, next) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, handleMasterRoute(req, res, next)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        this.server.get('/channels/:channelId/:file', function (req, res, next) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        req.query['channel'] = req.params.channelId;
                        return [4 /*yield*/, handleMasterRoute(req, res, next)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        this.server.pre(preflight.handler);
        this.server.get('/eventstream/:sessionId', this._handleEventStream.bind(this));
        this.server.get('/status/:sessionId', this._handleStatus.bind(this));
        this.server.get('/health', this._handleAggregatedSessionHealth.bind(this));
        this.server.get('/health/:sessionId', this._handleSessionHealth.bind(this));
        this.server.get('/reset', this._handleSessionsReset.bind(this));
        this.server.get('/reset/:sessionId', this._handleSessionReset.bind(this));
        this.server.get(vttBasePath + DefaultDummySubtitleEndpointPath, this._handleDummySubtitleEndpoint.bind(this));
        this.server.get(vttBasePath + DefaultSubtitleSpliceEndpointPath, this._handleSubtitleSliceEndpoint.bind(this));
        this.server.on('NotFound', function (req, res, err, next) {
            res.header("X-Instance-Id", _this.instanceId + "<".concat(version, ">"));
            return next();
        });
        this.server.on('InternalServer', function (req, res, err, next) {
            res.header("X-Instance-Id", _this.instanceId + "<".concat(version, ">"));
            return next();
        });
        if (options && options.heartbeat) {
            this.server.get(options.heartbeat, this._handleHeartbeat.bind(this));
        }
        if (options && options.channelManager) {
            var t = setInterval(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.updateChannelsAsync(options.channelManager, options)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            }); }); }, 60 * 1000);
        }
        var LeaderSyncSessionTypes = function () { return __awaiter(_this, void 0, void 0, function () {
            var isLeader;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, timer(10 * 1000)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.sessionStore.sessionStateStore.isLeader(this.instanceId)];
                    case 2:
                        isLeader = _a.sent();
                        if (!isLeader) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.sessionLiveStore.sessionLiveStateStore.setLeader(this.instanceId)];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        }); };
        LeaderSyncSessionTypes();
        var ping = setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.sessionStore.sessionStateStore.ping(this.instanceId)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.sessionLiveStore.sessionLiveStateStore.ping(this.instanceId)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); }, 3000);
        var StreamSwitchLoop = function (timeIntervalMs) { return __awaiter(_this, void 0, void 0, function () {
            var minIntervalMs, WTG, ts_1, ts_2, interval, tickInterval, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        minIntervalMs = 50;
                        WTG = new WaitTimeGenerator(timeIntervalMs, minIntervalMs);
                        _a.label = 1;
                    case 1:
                        if (!true) return [3 /*break*/, 9];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 6, , 8]);
                        ts_1 = Date.now();
                        return [4 /*yield*/, this.updateStreamSwitchAsync()];
                    case 3:
                        _a.sent();
                        ts_2 = Date.now();
                        interval = (timeIntervalMs - (ts_2 - ts_1)) < 0 ? minIntervalMs : (timeIntervalMs - (ts_2 - ts_1));
                        return [4 /*yield*/, WTG.getWaitTime(interval)];
                    case 4:
                        tickInterval = _a.sent();
                        return [4 /*yield*/, timer(tickInterval)];
                    case 5:
                        _a.sent();
                        debug("StreamSwitchLoop waited for all channels. Next tick in: ".concat(tickInterval, "ms"));
                        return [3 /*break*/, 8];
                    case 6:
                        err_1 = _a.sent();
                        console.error(err_1);
                        debug("StreamSwitchLoop iteration failed. Trying Again in 1000ms!");
                        return [4 /*yield*/, timer(1000)];
                    case 7:
                        _a.sent();
                        return [3 /*break*/, 8];
                    case 8: return [3 /*break*/, 1];
                    case 9: return [2 /*return*/];
                }
            });
        }); };
        if (this.streamSwitchManager) {
            StreamSwitchLoop(this.streamSwitchTimeIntervalMs);
        }
    }
    ChannelEngine.prototype.updateStreamSwitchAsync = function () {
        return __awaiter(this, void 0, void 0, function () {
            var channels, getSwitchStatusAndPerformSwitch, err_2;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        channels = Object.keys(sessionSwitchers);
                        getSwitchStatusAndPerformSwitch = function (channel) { return __awaiter(_this, void 0, void 0, function () {
                            var switcher, prevStatus, status_1, err_3;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        if (!sessionSwitchers[channel]) return [3 /*break*/, 5];
                                        switcher = sessionSwitchers[channel];
                                        prevStatus = switcherStatus[channel] !== null ? switcherStatus[channel] : null;
                                        switcherStatus[channel] = null;
                                        status_1 = null;
                                        _a.label = 1;
                                    case 1:
                                        _a.trys.push([1, 3, , 4]);
                                        return [4 /*yield*/, switcher.streamSwitcher(sessions[channel], sessionsLive[channel])];
                                    case 2:
                                        status_1 = _a.sent();
                                        debug("[".concat(channel, "]: streamSwitcher returned switchstatus=").concat(status_1));
                                        if (status_1 === undefined) {
                                            debug("[WARNING]: switcherStatus->".concat(status_1, ". Setting value to previous status->").concat(prevStatus));
                                            status_1 = prevStatus;
                                        }
                                        switcherStatus[channel] = status_1;
                                        return [3 /*break*/, 4];
                                    case 3:
                                        err_3 = _a.sent();
                                        throw new Error(err_3);
                                    case 4: return [3 /*break*/, 6];
                                    case 5:
                                        debug("Tried to switch stream on a non-existing channel=[".concat(channel, "]. Switching Ignored!)"));
                                        _a.label = 6;
                                    case 6: return [2 /*return*/];
                                }
                            });
                        }); };
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, Promise.all(channels.map(function (channel) { return getSwitchStatusAndPerformSwitch(channel); }))];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        err_2 = _a.sent();
                        debug('Problem occured when updating streamSwitchers');
                        throw new Error(err_2);
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    ChannelEngine.prototype.updateChannelsAsync = function (channelMgr, options) {
        return __awaiter(this, void 0, void 0, function () {
            var newChannels, addAsync, addLiveAsync, removedChannels, removeAsync;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        debug("Do we have any new channels?");
                        newChannels = channelMgr.getChannels().filter(function (channel) { return !sessions[channel.id]; });
                        debug(newChannels);
                        addAsync = function (channel) { return __awaiter(_this, void 0, void 0, function () {
                            var _this = this;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        debug("Adding channel with ID ".concat(channel.id));
                                        sessions[channel.id] = new Session(this.assetMgr, {
                                            sessionId: channel.id,
                                            averageSegmentDuration: channel.options && channel.options.averageSegmentDuration ? channel.options.averageSegmentDuration : this.streamerOpts.defaultAverageSegmentDuration,
                                            useDemuxedAudio: options.useDemuxedAudio,
                                            dummySubtitleEndpoint: this.dummySubtitleEndpoint,
                                            subtitleSliceEndpoint: this.subtitleSliceEndpoint,
                                            useVTTSubtitles: this.useVTTSubtitles,
                                            alwaysNewSegments: options.alwaysNewSegments,
                                            sessionResetKey: options.sessionResetKey,
                                            partialStoreHLSVod: options.partialStoreHLSVod,
                                            alwaysMapBandwidthByNearest: options.alwaysMapBandwidthByNearest,
                                            noSessionDataTags: options.noSessionDataTags,
                                            playheadDiffThreshold: channel.options && channel.options.playheadDiffThreshold ? channel.options.playheadDiffThreshold : this.streamerOpts.defaultPlayheadDiffThreshold,
                                            maxTickInterval: channel.options && channel.options.maxTickInterval ? channel.options.maxTickInterval : this.streamerOpts.defaultMaxTickInterval,
                                            targetDurationPadding: channel.options && channel.options.targetDurationPadding ? channel.options.targetDurationPadding : this.streamerOpts.targetDurationPadding,
                                            forceTargetDuration: channel.options && channel.options.forceTargetDuration ? channel.options.forceTargetDuration : this.streamerOpts.forceTargetDuration,
                                            diffCompensationRate: channel.options && channel.options.diffCompensationRate ? channel.options.diffCompensationRate : this.streamerOpts.diffCompensationRate,
                                            profile: channel.profile,
                                            audioTracks: channel.audioTracks,
                                            subtitleTracks: channel.subtitleTracks,
                                            closedCaptions: channel.closedCaptions,
                                            slateUri: channel.slate && channel.slate.uri ? channel.slate.uri : this.defaultSlateUri,
                                            slateRepetitions: channel.slate && channel.slate.repetitions ? channel.slate.repetitions : this.slateRepetitions,
                                            slateDuration: channel.slate && channel.slate.duration ? channel.slate.duration : this.slateDuration,
                                            cloudWatchMetrics: this.logCloudWatchMetrics,
                                            sessionEventStream: options.sessionEventStream
                                        }, this.sessionStore);
                                        sessionsLive[channel.id] = new SessionLive({
                                            sessionId: channel.id,
                                            useDemuxedAudio: options.useDemuxedAudio,
                                            dummySubtitleEndpoint: this.dummySubtitleEndpoint,
                                            subtitleSliceEndpoint: this.subtitleSliceEndpoint,
                                            useVTTSubtitles: this.useVTTSubtitles,
                                            cloudWatchMetrics: this.logCloudWatchMetrics,
                                            profile: channel.profile,
                                        }, this.sessionLiveStore);
                                        sessionSwitchers[channel.id] = new StreamSwitcher({
                                            sessionId: channel.id,
                                            streamSwitchManager: this.streamSwitchManager ? this.streamSwitchManager : null
                                        });
                                        return [4 /*yield*/, sessions[channel.id].initAsync()];
                                    case 1:
                                        _a.sent();
                                        return [4 /*yield*/, sessionsLive[channel.id].initAsync()];
                                    case 2:
                                        _a.sent();
                                        if (!this.monitorTimer[channel.id]) {
                                            this.monitorTimer[channel.id] = setInterval(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                                switch (_a.label) {
                                                    case 0: return [4 /*yield*/, this._monitorAsync(sessions[channel.id], sessionsLive[channel.id])];
                                                    case 1:
                                                        _a.sent();
                                                        return [2 /*return*/];
                                                }
                                            }); }); }, 5000);
                                        }
                                        return [4 /*yield*/, sessions[channel.id].startPlayheadAsync()];
                                    case 3:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); };
                        addLiveAsync = function (channel) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        debug("Adding live channel with ID ".concat(channel.id));
                                        return [4 /*yield*/, sessionsLive[channel.id].initAsync()];
                                    case 1:
                                        _a.sent();
                                        return [4 /*yield*/, sessionsLive[channel.id].startPlayheadAsync()];
                                    case 2:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); };
                        return [4 /*yield*/, Promise.all(newChannels.map(function (channel) { return addAsync(channel); }).concat(newChannels.map(function (channel) { return addLiveAsync(channel); })))];
                    case 1:
                        _a.sent();
                        debug("Have any channels been removed?");
                        removedChannels = Object.keys(sessions).filter(function (channelId) { return !channelMgr.getChannels().find(function (ch) { return ch.id == channelId; }); });
                        removeAsync = function (channelId) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        debug("Removing channel with ID ".concat(channelId));
                                        clearInterval(this.monitorTimer[channelId]);
                                        return [4 /*yield*/, sessions[channelId].stopPlayheadAsync()];
                                    case 1:
                                        _a.sent();
                                        if (!sessionsLive[channelId]) return [3 /*break*/, 3];
                                        return [4 /*yield*/, sessionsLive[channelId].stopPlayheadAsync()];
                                    case 2:
                                        _a.sent();
                                        delete sessionsLive[channelId];
                                        return [3 /*break*/, 4];
                                    case 3:
                                        debug("Cannot remove live session of channel that does not exist ".concat(channelId));
                                        _a.label = 4;
                                    case 4:
                                        delete sessions[channelId];
                                        delete sessionSwitchers[channelId];
                                        delete switcherStatus[channelId];
                                        return [2 /*return*/];
                                }
                            });
                        }); };
                        return [4 /*yield*/, Promise.all(removedChannels.map(function (channelId) { return removeAsync(channelId); }))];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    ChannelEngine.prototype.start = function () {
        var _this = this;
        var startAsync = function (channelId) { return __awaiter(_this, void 0, void 0, function () {
            var session, sessionLive;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        session = sessions[channelId];
                        sessionLive = sessionsLive[channelId];
                        if (!this.monitorTimer[channelId]) {
                            this.monitorTimer[channelId] = setInterval(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, this._monitorAsync(session, sessionLive)];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            }); }); }, 5000);
                        }
                        session.startPlayheadAsync();
                        return [4 /*yield*/, sessionLive.startPlayheadAsync()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); };
        var startLiveAsync = function (channelId) { return __awaiter(_this, void 0, void 0, function () {
            var sessionLive;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sessionLive = sessionsLive[channelId];
                        return [4 /*yield*/, sessionLive.startPlayheadAsync()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); };
        (function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        debug("Starting engine");
                        return [4 /*yield*/, this.updateChannelsAsync(this.options.channelManager, this.options)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, Promise.all(Object.keys(sessions).map(function (channelId) { return startAsync(channelId); }).concat(Object.keys(sessionsLive).map(function (channelId) { return startLiveAsync(channelId); })))];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); })();
    };
    ChannelEngine.prototype.listen = function (port) {
        var _this = this;
        this.server.listen(port, function () {
            debug('%s listening at %s', _this.server.name, _this.server.url);
        });
    };
    ChannelEngine.prototype.getStatusForSessionAsync = function (sessionId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, sessions[sessionId].getStatusAsync()];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    ChannelEngine.prototype.getSessionCount = function () {
        return Object.keys(sessions).length;
    };
    ChannelEngine.prototype.getPlayheadCount = function () {
        return Object.keys(sessions).filter(function (sessionId) { return sessions[sessionId].hasPlayhead(); }).length;
    };
    ChannelEngine.prototype._monitorAsync = function (session, sessionLive) {
        return __awaiter(this, void 0, void 0, function () {
            var statusSessionLive, statusSession;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        statusSessionLive = sessionLive.getStatus();
                        return [4 /*yield*/, session.getStatusAsync()];
                    case 1:
                        statusSession = _a.sent();
                        debug("MONITOR: (".concat(new Date().toISOString(), ") [").concat(statusSession.sessionId, "]: playhead: ").concat(statusSession.playhead.state));
                        debug("MONITOR: (".concat(new Date().toISOString(), ") [").concat(statusSessionLive.sessionId, "]: live-playhead: ").concat(statusSessionLive.playhead.state));
                        if (!(statusSessionLive.playhead.state === 'crashed')) return [3 /*break*/, 3];
                        debug("[".concat(statusSessionLive.sessionId, "]: SessionLive-Playhead crashed, restarting"));
                        return [4 /*yield*/, sessionLive.restartPlayheadAsync()];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        if (!(statusSession.playhead.state === 'crashed')) return [3 /*break*/, 5];
                        debug("[".concat(statusSession.sessionId, "]: Session-Playhead crashed, restarting"));
                        return [4 /*yield*/, session.restartPlayheadAsync()];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 5:
                        if (!(statusSession.playhead.state === 'idle')) return [3 /*break*/, 7];
                        debug("[".concat(statusSession.sessionId, "]: Starting playhead"));
                        return [4 /*yield*/, session.startPlayheadAsync()];
                    case 6:
                        _a.sent();
                        _a.label = 7;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    ChannelEngine.prototype.createChannel = function (channelId) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!sessions[channelId]) return [3 /*break*/, 2];
                        if (!this.options.channelManager.autoCreateChannel) return [3 /*break*/, 2];
                        this.options.channelManager.autoCreateChannel(channelId);
                        setTimeout(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, this.updateChannelsAsync(this.options.channelManager, this.options)];
                                case 1:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        }); }); });
                        return [4 /*yield*/, timer(AUTO_CREATE_CHANNEL_TIMEOUT)];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    ChannelEngine.prototype.getMasterManifest = function (channelId) {
        return __awaiter(this, void 0, void 0, function () {
            var session, masterM3U8, err;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!sessions[channelId]) return [3 /*break*/, 2];
                        session = sessions[channelId];
                        return [4 /*yield*/, session.getMasterManifestAsync()];
                    case 1:
                        masterM3U8 = _a.sent();
                        return [2 /*return*/, masterM3U8];
                    case 2:
                        err = new errs.NotFoundError('Invalid session');
                        return [2 /*return*/, Promise.reject(err)];
                }
            });
        });
    };
    ChannelEngine.prototype.getMediaManifests = function (channelId) {
        return __awaiter(this, void 0, void 0, function () {
            var allMediaM3U8_1, promises_1, session_1, bandwidths, addM3U8_1, err;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!sessions[channelId]) return [3 /*break*/, 2];
                        allMediaM3U8_1 = {};
                        promises_1 = [];
                        session_1 = sessions[channelId];
                        bandwidths = this.options.channelManager
                            .getChannels()
                            .filter(function (ch) { return ch.id === channelId; })
                            .pop()
                            .profile
                            .map(function (profile) { return profile.bw; });
                        addM3U8_1 = function (bw) { return __awaiter(_this, void 0, void 0, function () {
                            var _a, _b;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        _a = allMediaM3U8_1;
                                        _b = bw;
                                        return [4 /*yield*/, session_1.getCurrentMediaManifestAsync(bw)];
                                    case 1:
                                        _a[_b] = _c.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); };
                        bandwidths.forEach(function (bw) {
                            promises_1.push(addM3U8_1(bw));
                        });
                        return [4 /*yield*/, Promise.all(promises_1)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, allMediaM3U8_1];
                    case 2:
                        err = new errs.NotFoundError('Invalid session');
                        return [2 /*return*/, Promise.reject(err)];
                }
            });
        });
    };
    ChannelEngine.prototype.getAudioManifests = function (channelId) {
        return __awaiter(this, void 0, void 0, function () {
            var allAudioM3U8_1, promises_2, session_2, addM3U8_2, audioGroupsAndLangs, _loop_1, _i, _a, _b, audioGroup, languages, err;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!sessions[channelId]) return [3 /*break*/, 3];
                        allAudioM3U8_1 = {};
                        promises_2 = [];
                        session_2 = sessions[channelId];
                        addM3U8_2 = function (groupId, lang) { return __awaiter(_this, void 0, void 0, function () {
                            var audioM3U8;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, session_2.getCurrentAudioManifestAsync(groupId, lang)];
                                    case 1:
                                        audioM3U8 = _a.sent();
                                        if (!allAudioM3U8_1[groupId]) {
                                            allAudioM3U8_1[groupId] = {};
                                        }
                                        allAudioM3U8_1[groupId][lang] = audioM3U8;
                                        return [2 /*return*/];
                                }
                            });
                        }); };
                        return [4 /*yield*/, session_2.getAudioGroupsAndLangs()];
                    case 1:
                        audioGroupsAndLangs = _c.sent();
                        _loop_1 = function (audioGroup, languages) {
                            languages.forEach(function (lang) {
                                promises_2.push(addM3U8_2(audioGroup, lang));
                            });
                        };
                        for (_i = 0, _a = Object.entries(audioGroupsAndLangs); _i < _a.length; _i++) {
                            _b = _a[_i], audioGroup = _b[0], languages = _b[1];
                            _loop_1(audioGroup, languages);
                        }
                        return [4 /*yield*/, Promise.all(promises_2)];
                    case 2:
                        _c.sent();
                        return [2 /*return*/, allAudioM3U8_1];
                    case 3:
                        err = new errs.NotFoundError('Invalid session');
                        return [2 /*return*/, Promise.reject(err)];
                }
            });
        });
    };
    ChannelEngine.prototype.getSubtitleManifests = function (channelId) {
        return __awaiter(this, void 0, void 0, function () {
            var allSubtitleM3U8_1, promises_3, session_3, addM3U8_3, subtitleGroupsAndLangs, _loop_2, _i, _a, _b, subtitleGroup, languages, err;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!sessions[channelId]) return [3 /*break*/, 3];
                        allSubtitleM3U8_1 = {};
                        promises_3 = [];
                        session_3 = sessions[channelId];
                        addM3U8_3 = function (groupId, lang) { return __awaiter(_this, void 0, void 0, function () {
                            var subtitleM3U8;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, session_3.getCurrentSubtitleManifestAsync(groupId, lang)];
                                    case 1:
                                        subtitleM3U8 = _a.sent();
                                        if (!allSubtitleM3U8_1[groupId]) {
                                            allSubtitleM3U8_1[groupId] = {};
                                        }
                                        allSubtitleM3U8_1[groupId][lang] = subtitleM3U8;
                                        return [2 /*return*/];
                                }
                            });
                        }); };
                        return [4 /*yield*/, session_3.getSubtitleGroupsAndLangs()];
                    case 1:
                        subtitleGroupsAndLangs = _c.sent();
                        _loop_2 = function (subtitleGroup, languages) {
                            languages.forEach(function (lang) {
                                promises_3.push(addM3U8_3(subtitleGroup, lang));
                            });
                        };
                        for (_i = 0, _a = Object.entries(subtitleGroupsAndLangs); _i < _a.length; _i++) {
                            _b = _a[_i], subtitleGroup = _b[0], languages = _b[1];
                            _loop_2(subtitleGroup, languages);
                        }
                        return [4 /*yield*/, Promise.all(promises_3)];
                    case 2:
                        _c.sent();
                        return [2 /*return*/, allSubtitleM3U8_1];
                    case 3:
                        err = new errs.NotFoundError('Invalid session');
                        return [2 /*return*/, Promise.reject(err)];
                }
            });
        });
    };
    ChannelEngine.prototype._handleHeartbeat = function (req, res, next) {
        debug('req.url=' + req.url);
        res.send(200);
        next();
    };
    ChannelEngine.prototype._handleMasterManifest = function (req, res, next) {
        return __awaiter(this, void 0, void 0, function () {
            var session, sessionLive, options, eventStream, filter, body, err_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        debug('req.url=' + req.url);
                        debug(req.query);
                        options = {};
                        if (req.query['playlist']) {
                            // Backward compatibility
                            options.category = req.query['playlist'];
                        }
                        if (req.query['category']) {
                            options.category = req.query['category'];
                        }
                        if (!(this.autoCreateSession && req.query['channel'])) return [3 /*break*/, 2];
                        debug("Attempting to create channel with id ".concat(req.query['channel']));
                        return [4 /*yield*/, this.createChannel(req.query['channel'])];
                    case 1:
                        _a.sent();
                        debug("Automatically created channel with id ".concat(req.query['channel']));
                        _a.label = 2;
                    case 2:
                        if (req.query['channel'] && sessions[req.query['channel']]) {
                            session = sessions[req.query['channel']];
                        }
                        else if (req.query['session'] && sessions[req.query['session']]) {
                            session = sessions[req.query['session']];
                        }
                        if (req.query['startWithId']) {
                            options.startWithId = req.query['startWithId'];
                            debug("New session to start with assetId=".concat(options.startWithId));
                        }
                        if (!session) return [3 /*break*/, 7];
                        eventStream = new EventStream(session);
                        eventStreams[session.sessionId] = eventStream;
                        filter = void 0;
                        if (req.query['filter']) {
                            debug("Applying filter on master manifest ".concat(req.query['filter']));
                            filter = filterQueryParser(req.query['filter']);
                        }
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, session.getMasterManifestAsync(filter)];
                    case 4:
                        body = _a.sent();
                        res.sendRaw(200, Buffer.from(body, 'utf8'), {
                            "Content-Type": "application/vnd.apple.mpegurl",
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Headers": "X-Session-Id",
                            "Access-Control-Expose-Headers": "X-Session-Id",
                            "Cache-Control": "max-age=300",
                            "X-Session-Id": session.sessionId,
                            "X-Instance-Id": this.instanceId + "<".concat(version, ">"),
                        });
                        next();
                        return [3 /*break*/, 6];
                    case 5:
                        err_4 = _a.sent();
                        next(this._errorHandler(err_4));
                        return [3 /*break*/, 6];
                    case 6: return [3 /*break*/, 8];
                    case 7:
                        next(this._gracefulErrorHandler("Could not find a valid session"));
                        _a.label = 8;
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    ChannelEngine.prototype._handleAudioManifest = function (req, res, next) {
        return __awaiter(this, void 0, void 0, function () {
            var session, body, err_5, err;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        debug("req.url=".concat(req.url));
                        session = sessions[req.params[2]];
                        if (!session) return [3 /*break*/, 5];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, session.getCurrentAudioManifestAsync(req.params[0], req.params[1], req.headers["x-playback-session-id"])];
                    case 2:
                        body = _a.sent();
                        res.sendRaw(200, Buffer.from(body, 'utf8'), {
                            "Content-Type": "application/vnd.apple.mpegurl",
                            "Access-Control-Allow-Origin": "*",
                            "Cache-Control": "max-age=".concat(this.streamerOpts.cacheTTL || '4'),
                            "X-Instance-Id": this.instanceId + "<".concat(version, ">"),
                        });
                        next();
                        return [3 /*break*/, 4];
                    case 3:
                        err_5 = _a.sent();
                        next(this._gracefulErrorHandler(err_5));
                        return [3 /*break*/, 4];
                    case 4: return [3 /*break*/, 6];
                    case 5:
                        err = new errs.NotFoundError('Invalid session');
                        next(err);
                        _a.label = 6;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    ChannelEngine.prototype._handleSubtitleManifest = function (req, res, next) {
        return __awaiter(this, void 0, void 0, function () {
            var session, body, err_6, err;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        debug("req.url=".concat(req.url));
                        session = sessions[req.params[2]];
                        if (!session) return [3 /*break*/, 5];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, session.getCurrentSubtitleManifestAsync(req.params[0], req.params[1], req.headers["x-playback-session-id"])];
                    case 2:
                        body = _a.sent();
                        res.sendRaw(200, Buffer.from(body, 'utf8'), {
                            "Content-Type": "application/vnd.apple.mpegurl",
                            "Access-Control-Allow-Origin": "*",
                            "Cache-Control": "max-age=".concat(this.streamerOpts.cacheTTL || '4'),
                            "X-Instance-Id": this.instanceId + "<".concat(version, ">"),
                        });
                        next();
                        return [3 /*break*/, 4];
                    case 3:
                        err_6 = _a.sent();
                        next(this._gracefulErrorHandler(err_6));
                        return [3 /*break*/, 4];
                    case 4: return [3 /*break*/, 6];
                    case 5:
                        err = new errs.NotFoundError('Invalid session');
                        next(err);
                        _a.label = 6;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    ChannelEngine.prototype._handleDummySubtitleEndpoint = function (req, res, next) {
        return __awaiter(this, void 0, void 0, function () {
            var body;
            return __generator(this, function (_a) {
                debug("req.url=".concat(req.url));
                try {
                    body = "WEBVTT\nX-TIMESTAMP-MAP=MPEGTS:0,LOCAL:00:00:00.000\n\n";
                    res.sendRaw(200, Buffer.from(body, 'utf8'), {
                        "Content-Type": "text/vtt",
                        "Access-Control-Allow-Origin": "*",
                        "Cache-Control": "max-age=".concat(this.streamerOpts.cacheTTL || '4'),
                        "X-Instance-Id": this.instanceId + "<".concat(version, ">"),
                    });
                    next();
                }
                catch (err) {
                    next(this._gracefulErrorHandler(err));
                }
                return [2 /*return*/];
            });
        });
    };
    ChannelEngine.prototype._handleSubtitleSliceEndpoint = function (req, res, next) {
        return __awaiter(this, void 0, void 0, function () {
            var slicer, body, err_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        debug("req.url=".concat(req.url));
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        slicer = new SubtitleSlicer();
                        return [4 /*yield*/, slicer.generateVtt(req.query)];
                    case 2:
                        body = _a.sent();
                        res.sendRaw(200, Buffer.from(body, 'utf8'), {
                            "Content-Type": "text/vtt",
                            "Access-Control-Allow-Origin": "*",
                            "Cache-Control": "max-age=".concat(this.streamerOpts.cacheTTL || '4'),
                            "X-Instance-Id": this.instanceId + "<".concat(version, ">"),
                        });
                        next();
                        return [3 /*break*/, 4];
                    case 3:
                        err_7 = _a.sent();
                        next(this._gracefulErrorHandler(err_7));
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    ChannelEngine.prototype._handleMediaManifest = function (req, res, next) {
        return __awaiter(this, void 0, void 0, function () {
            var session, sessionLive, body, err_8, err;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        debug("x-playback-session-id=".concat(req.headers["x-playback-session-id"], " req.url=").concat(req.url));
                        debug(req.params);
                        session = sessions[req.params[1]];
                        sessionLive = sessionsLive[req.params[1]];
                        if (!(session && sessionLive)) return [3 /*break*/, 12];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 10, , 11]);
                        body = null;
                        if (!!this.streamSwitchManager) return [3 /*break*/, 3];
                        debug("[".concat(req.params[1], "]: Responding with VOD2Live manifest"));
                        return [4 /*yield*/, session.getCurrentMediaManifestAsync(req.params[0], req.headers["x-playback-session-id"])];
                    case 2:
                        body = _a.sent();
                        return [3 /*break*/, 9];
                    case 3:
                        if (!(switcherStatus[req.params[1]] === null || switcherStatus[req.params[1]] === undefined)) return [3 /*break*/, 5];
                        debug("[".concat(req.params[1], "]: (").concat(switcherStatus[req.params[1]], ") Waiting for streamSwitcher to respond"));
                        return [4 /*yield*/, timer(500)];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 5:
                        debug("switcherStatus[".concat(req.params[1], "]=[").concat(switcherStatus[req.params[1]], "]"));
                        if (!switcherStatus[req.params[1]]) return [3 /*break*/, 7];
                        debug("[".concat(req.params[1], "]: Responding with Live-stream manifest"));
                        return [4 /*yield*/, sessionLive.getCurrentMediaManifestAsync(req.params[0])];
                    case 6:
                        body = _a.sent();
                        return [3 /*break*/, 9];
                    case 7:
                        debug("[".concat(req.params[1], "]: Responding with VOD2Live manifest"));
                        return [4 /*yield*/, session.getCurrentMediaManifestAsync(req.params[0], req.headers["x-playback-session-id"])];
                    case 8:
                        body = _a.sent();
                        _a.label = 9;
                    case 9:
                        //verbose(`[${session.sessionId}] body=`);
                        //verbose(body);
                        res.sendRaw(200, Buffer.from(body, 'utf8'), {
                            "Content-Type": "application/vnd.apple.mpegurl",
                            "Access-Control-Allow-Origin": "*",
                            "Cache-Control": "max-age=".concat(this.streamerOpts.cacheTTL || '4'),
                            "X-Instance-Id": this.instanceId + "<".concat(version, ">"),
                        });
                        next();
                        return [3 /*break*/, 11];
                    case 10:
                        err_8 = _a.sent();
                        next(this._gracefulErrorHandler(err_8));
                        return [3 /*break*/, 11];
                    case 11: return [3 /*break*/, 13];
                    case 12:
                        err = new errs.NotFoundError('Invalid session(s)');
                        next(err);
                        _a.label = 13;
                    case 13: return [2 /*return*/];
                }
            });
        });
    };
    ChannelEngine.prototype._handleEventStream = function (req, res, next) {
        var _this = this;
        debug("req.url=".concat(req.url));
        var eventStream = eventStreams[req.params.sessionId];
        if (eventStream) {
            eventStream.poll().then(function (body) {
                res.sendRaw(200, body, {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Cache-Control": "max-age=4",
                });
                next();
            }).catch(function (err) {
                next(_this._errorHandler(err));
            });
        }
        else {
            // Silent error
            debug("No event stream found for session=".concat(req.params.sessionId));
            res.sendRaw(200, '{}', {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "max-age=4",
            });
            next();
        }
    };
    ChannelEngine.prototype._handleStatus = function (req, res, next) {
        return __awaiter(this, void 0, void 0, function () {
            var session, body, err;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        debug("req.url=".concat(req.url));
                        session = sessions[req.params.sessionId];
                        if (!session) return [3 /*break*/, 2];
                        return [4 /*yield*/, session.getStatusAsync()];
                    case 1:
                        body = _a.sent();
                        res.sendRaw(200, JSON.stringify(body), {
                            "Content-Type": "application/json",
                            "Access-Control-Allow-Origin": "*",
                            "Cache-Control": "no-cache",
                        });
                        next();
                        return [3 /*break*/, 3];
                    case 2:
                        err = new errs.NotFoundError('Invalid session');
                        next(err);
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    ChannelEngine.prototype._handleAggregatedSessionHealth = function (req, res, next) {
        return __awaiter(this, void 0, void 0, function () {
            var failingSessions, endpoints, _i, _a, sessionId, session, status_2, engineStatus;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        debug("req.url=".concat(req.url));
                        if (this.sessionHealthKey && this.sessionHealthKey !== req.headers['x-health-key']) {
                            res.sendRaw(403, JSON.stringify({ "message": "Invalid Session-Health-Key" }), {
                                "Content-Type": "application/json",
                                "Access-Control-Allow-Origin": "*",
                                "Cache-Control": "no-cache",
                            });
                            next();
                            return [2 /*return*/];
                        }
                        failingSessions = [];
                        endpoints = [];
                        _i = 0, _a = Object.keys(sessions);
                        _b.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                        sessionId = _a[_i];
                        session = sessions[sessionId];
                        if (!(session && session.hasPlayhead())) return [3 /*break*/, 3];
                        return [4 /*yield*/, session.getStatusAsync()];
                    case 2:
                        status_2 = _b.sent();
                        if (status_2.playhead && status_2.playhead.state !== "running") {
                            failingSessions.push(status_2);
                        }
                        endpoints.push({
                            health: '/health/' + sessionId,
                            status: '/status/' + sessionId,
                            playback: "/channels/".concat(sessionId, "/master.m3u8"),
                        });
                        _b.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4:
                        engineStatus = {
                            startTime: new Date(this.serverStartTime).toISOString(),
                            uptime: toHHMMSS((Date.now() - this.serverStartTime) / 1000),
                            version: version,
                            instanceId: this.instanceId,
                        };
                        if (failingSessions.length === 0) {
                            res.sendRaw(200, JSON.stringify({ "health": "ok", "engine": engineStatus, "count": endpoints.length, "sessionEndpoints": endpoints }), {
                                "Content-Type": "application/json",
                                "Access-Control-Allow-Origin": "*",
                                "Cache-Control": "no-cache",
                            });
                        }
                        else {
                            res.sendRaw(503, JSON.stringify({ "health": "unhealthy", "engine": engineStatus, "failed": failingSessions }), {
                                "Content-Type": "application/json",
                                "Access-Control-Allow-Origin": "*",
                                "Cache-Control": "no-cache",
                            });
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    ChannelEngine.prototype._handleSessionHealth = function (req, res, next) {
        return __awaiter(this, void 0, void 0, function () {
            var session, status_3, err;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        debug("req.url=".concat(req.url));
                        session = sessions[req.params.sessionId];
                        if (!session) return [3 /*break*/, 2];
                        return [4 /*yield*/, session.getStatusAsync()];
                    case 1:
                        status_3 = _a.sent();
                        if (status_3.playhead && status_3.playhead.state === "running") {
                            res.sendRaw(200, JSON.stringify({ "health": "ok", "tick": status_3.playhead.tickMs, "mediaSeq": status_3.playhead.mediaSeq }), {
                                "Content-Type": "application/json",
                                "Access-Control-Allow-Origin": "*",
                                "Cache-Control": "no-cache",
                            });
                        }
                        else {
                            res.sendRaw(503, JSON.stringify({ "health": "unhealthy" }), {
                                "Content-Type": "application/json",
                                "Access-Control-Allow-Origin": "*",
                                "Cache-Control": "no-cache",
                            });
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        err = new errs.NotFoundError('Invalid session');
                        next(err);
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    ChannelEngine.prototype._handleSessionsReset = function (req, res, next) {
        return __awaiter(this, void 0, void 0, function () {
            var sessionResets, _i, _a, sessionId, session, sessionLive, err;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        debug("req.url=".concat(req.url));
                        if (this.sessionResetKey && req.query.key !== this.sessionResetKey) {
                            res.sendRaw(403, JSON.stringify({ "message": "Invalid Session-Reset-Key" }), {
                                "Content-Type": "application/json",
                                "Access-Control-Allow-Origin": "*",
                                "Cache-Control": "no-cache",
                            });
                            next();
                            return [2 /*return*/];
                        }
                        sessionResets = [];
                        _i = 0, _a = Object.keys(sessions);
                        _b.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 5];
                        sessionId = _a[_i];
                        session = sessions[sessionId];
                        sessionLive = sessionsLive[sessionId];
                        if (!(session && sessionLive)) return [3 /*break*/, 3];
                        return [4 /*yield*/, session.resetAsync()];
                    case 2:
                        _b.sent();
                        sessionResets.push(sessionId);
                        return [3 /*break*/, 4];
                    case 3:
                        err = new errs.NotFoundError('Invalid session');
                        next(err);
                        _b.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 1];
                    case 5:
                        res.sendRaw(200, JSON.stringify({ "status": "ok", "instanceId": this.instanceId, "resets": sessionResets }), {
                            "Content-Type": "application/json",
                            "Access-Control-Allow-Origin": "*",
                            "Cache-Control": "no-cache",
                        });
                        return [2 /*return*/];
                }
            });
        });
    };
    ChannelEngine.prototype._handleSessionReset = function (req, res, next) {
        return __awaiter(this, void 0, void 0, function () {
            var sessionId, sessionResets, session, sessionLive, e_1, err;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        debug("req.url=".concat(req.url));
                        if (this.sessionResetKey && req.query.key !== this.sessionResetKey) {
                            res.sendRaw(403, JSON.stringify({ "message": "Invalid Session-Reset-Key" }), {
                                "Content-Type": "application/json",
                                "Access-Control-Allow-Origin": "*",
                                "Cache-Control": "no-cache",
                            });
                            next();
                            return [2 /*return*/];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 5, , 6]);
                        sessionId = void 0;
                        if (req.params && req.params.sessionId) {
                            sessionId = req.params.sessionId;
                        }
                        sessionResets = [];
                        session = sessions[sessionId];
                        sessionLive = sessionsLive[sessionId];
                        if (!(session && sessionLive)) return [3 /*break*/, 3];
                        return [4 /*yield*/, session.resetAsync(sessionId)];
                    case 2:
                        _a.sent();
                        sessionResets.push(sessionId);
                        return [3 /*break*/, 4];
                    case 3:
                        res.sendRaw(400, JSON.stringify({ "message": "Invalid Session ID" }), {
                            "Content-Type": "application/json",
                            "Access-Control-Allow-Origin": "*",
                            "Cache-Control": "no-cache",
                        });
                        next();
                        return [2 /*return*/];
                    case 4:
                        res.sendRaw(200, JSON.stringify({ "status": "ok", "instanceId": this.instanceId, "resets": sessionResets }), {
                            "Content-Type": "application/json",
                            "Access-Control-Allow-Origin": "*",
                            "Cache-Control": "no-cache",
                        });
                        next();
                        return [3 /*break*/, 6];
                    case 5:
                        e_1 = _a.sent();
                        res.sendRaw(500, JSON.stringify({ "error": e_1 }), {
                            "Content-Type": "application/json",
                            "Access-Control-Allow-Origin": "*",
                            "Cache-Control": "no-cache",
                        });
                        err = new errs.NotFoundError('Session Reset Failed');
                        next(err);
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    ChannelEngine.prototype._gracefulErrorHandler = function (errMsg) {
        console.error(errMsg);
        var err = new errs.NotFoundError(errMsg);
        return err;
    };
    ChannelEngine.prototype._errorHandler = function (errMsg) {
        console.error(errMsg);
        var err = new errs.InternalServerError(errMsg);
        return err;
    };
    return ChannelEngine;
}());
exports.ChannelEngine = ChannelEngine;
