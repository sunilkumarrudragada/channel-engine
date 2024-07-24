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
var debug = require("debug")("engine-stream-switcher");
var crypto = require("crypto");
var fetch = require("node-fetch");
var AbortController = require("abort-controller").AbortController;
var SessionState = require("./session_state").SessionState;
var _a = require("./util"), timer = _a.timer, findNearestValue = _a.findNearestValue, isValidUrl = _a.isValidUrl, fetchWithRetry = _a.fetchWithRetry;
var m3u8 = require("@eyevinn/m3u8");
var SwitcherState = Object.freeze({
    V2L_TO_LIVE: 1,
    V2L_TO_VOD: 2,
    LIVE_TO_V2L: 3,
    LIVE_TO_LIVE: 4,
    LIVE_TO_VOD: 5,
});
var StreamType = Object.freeze({
    LIVE: 1,
    VOD: 2,
});
var FAIL_TIMEOUT = 3000;
var MAX_FAILS = 3;
var StreamSwitcher = /** @class */ (function () {
    function StreamSwitcher(config) {
        this.sessionId = crypto.randomBytes(20).toString("hex");
        this.useDemuxedAudio = false;
        this.cloudWatchLogging = false;
        this.streamTypeLive = false;
        this.streamSwitchManager = null;
        this.eventId = null;
        this.working = false;
        this.timeDiff = null;
        this.abortTimeStamp = null;
        if (config) {
            if (config.sessionId) {
                this.sessionId = config.sessionId;
            }
            if (config.useDemuxedAudio) {
                this.useDemuxedAudio = true;
            }
            if (config.cloudWatchMetrics) {
                this.cloudWatchLogging = true;
            }
            if (config.streamSwitchManager) {
                this.streamSwitchManager = config.streamSwitchManager;
            }
        }
        this.prerollsCache = {};
    }
    StreamSwitcher.prototype.getEventId = function () {
        return this.eventId;
    };
    StreamSwitcher.prototype.abortLiveFeed = function (session, sessionLive, message) {
        return __awaiter(this, void 0, void 0, function () {
            var status_1, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.streamTypeLive) return [3 /*break*/, 4];
                        status_1 = null;
                        debug("[".concat(this.sessionId, "]: Abort Live Stream! Reason: ").concat(message));
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        this.abortTimeStamp = Date.now();
                        return [4 /*yield*/, this._initSwitching(SwitcherState.LIVE_TO_V2L, session, sessionLive, null)];
                    case 2:
                        status_1 = _a.sent();
                        return [2 /*return*/, status_1];
                    case 3:
                        err_1 = _a.sent();
                        debug("Failed to force a switch off live feed: ".concat(err_1));
                        throw new Error(err_1);
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     *
     * @param {Session} session The VOD2Live Session object.
     * @param {SessionLive} sessionLive The Live Session object.
     * @returns A bool, true if streamSwitchManager contains current Live event to be played else false.
     */
    StreamSwitcher.prototype.streamSwitcher = function (session, sessionLive) {
        return __awaiter(this, void 0, void 0, function () {
            var status, sessionState, tsNow_1, strmSchedule, schedule, prerollUri, segments, prerollItem, err_2, scheduleObj, tries, validURI, delayMs, err_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        status = null;
                        if (!this.streamSwitchManager) {
                            debug("[".concat(this.sessionId, "]: No streamSwitchManager available"));
                            return [2 /*return*/, false];
                        }
                        if (this.working) {
                            debug("[".concat(this.sessionId, "]: streamSwitcher is currently busy"));
                            return [2 /*return*/, null];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 37, , 38]);
                        return [4 /*yield*/, session.getSessionState()];
                    case 2:
                        sessionState = _a.sent();
                        if (!(sessionState === SessionState.VOD_INIT || !sessionState)) return [3 /*break*/, 5];
                        this.working = true;
                        sessionLive.waitForPlayhead = false;
                        sessionLive.allowedToSet = false; // only have effect on leader
                        return [4 /*yield*/, sessionLive.resetSession()];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, sessionLive.resetLiveStoreAsync(0)];
                    case 4:
                        _a.sent();
                        this.working = false;
                        this.abortTimeStamp = Date.now() + 30 * 1000; // 30 second V2L->LIVE timeout
                        if (this.streamTypeLive) {
                            debug("[".concat(this.sessionId, "]: [ Ending LIVE Abruptly, Going to -> V2L ]"));
                            this.streamTypeLive = false;
                        }
                        debug("[".concat(this.sessionId, "]: StreamSwitcher reacting to Full Store Reset"));
                        return [2 /*return*/, false]; // Go to V2L feed
                    case 5:
                        tsNow_1 = Date.now();
                        return [4 /*yield*/, this.streamSwitchManager.getSchedule(this.sessionId)];
                    case 6:
                        strmSchedule = _a.sent();
                        schedule = strmSchedule.filter(function (obj) { return obj.end_time > tsNow_1; });
                        if (!(!this.prerollsCache[this.sessionId] || this.prerollsCache[this.sessionId].maxAge < tsNow_1)) return [3 /*break*/, 13];
                        if (!this.streamSwitchManager.getPrerollUri) return [3 /*break*/, 13];
                        return [4 /*yield*/, this.streamSwitchManager.getPrerollUri(this.sessionId)];
                    case 7:
                        prerollUri = _a.sent();
                        if (!isValidUrl(prerollUri)) return [3 /*break*/, 12];
                        _a.label = 8;
                    case 8:
                        _a.trys.push([8, 10, , 11]);
                        return [4 /*yield*/, this._loadPreroll(prerollUri)];
                    case 9:
                        segments = _a.sent();
                        prerollItem = {
                            segments: segments,
                            maxAge: tsNow_1 + 30 * 60 * 1000,
                        };
                        this.prerollsCache[this.sessionId] = prerollItem;
                        return [3 /*break*/, 11];
                    case 10:
                        err_2 = _a.sent();
                        debug("[".concat(this.sessionId, "]: Failed loading preroll vod for channel=").concat(this.sessionId));
                        console.error(err_2);
                        return [3 /*break*/, 11];
                    case 11: return [3 /*break*/, 13];
                    case 12:
                        debug("[".concat(this.sessionId, "]: Preroll uri:'").concat(prerollUri, "' is not a valid URL. Using No preroll."));
                        _a.label = 13;
                    case 13:
                        if (!(schedule.length === 0 && this.streamTypeLive)) return [3 /*break*/, 15];
                        return [4 /*yield*/, this._initSwitching(SwitcherState.LIVE_TO_V2L, session, sessionLive, null)];
                    case 14:
                        status = _a.sent();
                        return [2 /*return*/, status];
                    case 15:
                        if (schedule.length === 0) {
                            this.eventId = null;
                            return [2 /*return*/, false];
                        }
                        scheduleObj = schedule[0];
                        this.timeDiff = scheduleObj;
                        if (!(tsNow_1 < scheduleObj.start_time)) return [3 /*break*/, 18];
                        if (!this.streamTypeLive) return [3 /*break*/, 17];
                        return [4 /*yield*/, this._initSwitching(SwitcherState.LIVE_TO_V2L, session, sessionLive, null)];
                    case 16:
                        status = _a.sent();
                        return [2 /*return*/, status];
                    case 17:
                        this.eventId = null;
                        return [2 /*return*/, false];
                    case 18:
                        tries = 0;
                        validURI = false;
                        _a.label = 19;
                    case 19:
                        if (!(!validURI && tries < MAX_FAILS)) return [3 /*break*/, 23];
                        debug("[".concat(this.sessionId, "]: Switcher is validating Master URI... (tries left=").concat(MAX_FAILS - tries, ")"));
                        return [4 /*yield*/, this._validURI(scheduleObj.uri)];
                    case 20:
                        validURI = _a.sent();
                        tries++;
                        if (!!validURI) return [3 /*break*/, 22];
                        delayMs = tries * 500;
                        debug("[".concat(this.sessionId, "]: Going to try validating Master URI again in ").concat(delayMs, "ms"));
                        return [4 /*yield*/, timer(delayMs)];
                    case 21:
                        _a.sent();
                        _a.label = 22;
                    case 22: return [3 /*break*/, 19];
                    case 23:
                        if (!!validURI) return [3 /*break*/, 26];
                        debug("[".concat(this.sessionId, "]: Unreachable URI: [").concat(scheduleObj.uri, "]"));
                        if (!this.streamTypeLive) return [3 /*break*/, 25];
                        return [4 /*yield*/, this.abortLiveFeed(session, sessionLive, "Switching back to VOD2Live due to unreachable URI")];
                    case 24:
                        _a.sent();
                        _a.label = 25;
                    case 25: return [2 /*return*/, false];
                    case 26:
                        debug("[".concat(this.sessionId, "]: ....Master URI -> VALID"));
                        if (this.abortTimeStamp && tsNow_1 - this.abortTimeStamp <= 10000) {
                            // If we have a valid URI and no more than 10 seconds have passed since switching from Live->V2L.
                            // Stay on V2L to give live sessionLive some time to prepare before switching back to live.
                            debug("[".concat(this.sessionId, "]: Waiting [").concat(10000 - (tsNow_1 - this.abortTimeStamp), "ms] before switching back to Live due to unreachable URI"));
                            return [2 /*return*/, false];
                        }
                        this.abortTimeStamp = null;
                        if (!this.streamTypeLive) return [3 /*break*/, 30];
                        if (!(tsNow_1 >= scheduleObj.start_time && this.eventId !== scheduleObj.eventId)) return [3 /*break*/, 30];
                        if (!(scheduleObj.type === StreamType.LIVE)) return [3 /*break*/, 28];
                        return [4 /*yield*/, this._initSwitching(SwitcherState.LIVE_TO_LIVE, session, sessionLive, scheduleObj)];
                    case 27:
                        status = _a.sent();
                        return [2 /*return*/, status];
                    case 28: return [4 /*yield*/, this._initSwitching(SwitcherState.LIVE_TO_VOD, session, sessionLive, scheduleObj)];
                    case 29:
                        status = _a.sent();
                        return [2 /*return*/, status];
                    case 30:
                        if (!(tsNow_1 >= scheduleObj.start_time && tsNow_1 < scheduleObj.end_time && scheduleObj.end_time - tsNow_1 > 10000)) return [3 /*break*/, 36];
                        if (!(scheduleObj.type === StreamType.LIVE)) return [3 /*break*/, 33];
                        if (!!this.streamTypeLive) return [3 /*break*/, 32];
                        return [4 /*yield*/, this._initSwitching(SwitcherState.V2L_TO_LIVE, session, sessionLive, scheduleObj)];
                    case 31:
                        status = _a.sent();
                        return [2 /*return*/, status];
                    case 32: return [2 /*return*/, true];
                    case 33:
                        if (!!this.streamTypeLive) return [3 /*break*/, 36];
                        if (!scheduleObj.duration) {
                            debug("[".concat(this.sessionId, "]: Cannot switch VOD no duration specified for schedule item: [").concat(scheduleObj.assetId, "]"));
                            return [2 /*return*/, false];
                        }
                        if (!(this.eventId !== scheduleObj.eventId)) return [3 /*break*/, 35];
                        return [4 /*yield*/, this._initSwitching(SwitcherState.V2L_TO_VOD, session, sessionLive, scheduleObj)];
                    case 34:
                        status = _a.sent();
                        return [2 /*return*/, status];
                    case 35: return [2 /*return*/, false];
                    case 36: return [3 /*break*/, 38];
                    case 37:
                        err_3 = _a.sent();
                        debug("[".concat(this.sessionId, "]: Unexpected failure in Stream Switcher..."));
                        console.error(err_3);
                        throw new Error(err_3);
                    case 38: return [2 /*return*/];
                }
            });
        });
    };
    StreamSwitcher.prototype._initSwitching = function (state, session, sessionLive, scheduleObj) {
        return __awaiter(this, void 0, void 0, function () {
            var RESET_DELAY, liveCounts, liveSegments, currVodCounts, currLiveCounts, currVodSegments, eventSegments, liveUri, _a, prerollSegments, err_4, prerollSegments, err_5, prerollSegments, err_6, prerollSegments, err_7, prerollSegments, err_8;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.working = true;
                        RESET_DELAY = 5000;
                        liveCounts = 0;
                        liveSegments = null;
                        currVodCounts = 0;
                        currLiveCounts = 0;
                        currVodSegments = null;
                        eventSegments = null;
                        liveUri = null;
                        _a = state;
                        switch (_a) {
                            case SwitcherState.V2L_TO_LIVE: return [3 /*break*/, 1];
                            case SwitcherState.V2L_TO_VOD: return [3 /*break*/, 9];
                            case SwitcherState.LIVE_TO_V2L: return [3 /*break*/, 18];
                            case SwitcherState.LIVE_TO_VOD: return [3 /*break*/, 25];
                            case SwitcherState.LIVE_TO_LIVE: return [3 /*break*/, 34];
                        }
                        return [3 /*break*/, 43];
                    case 1:
                        _b.trys.push([1, 8, , 9]);
                        debug("[".concat(this.sessionId, "]: [ INIT Switching from V2L->LIVE ]"));
                        this.eventId = scheduleObj.eventId;
                        return [4 /*yield*/, session.getCurrentMediaAndDiscSequenceCount()];
                    case 2:
                        currVodCounts = _b.sent();
                        return [4 /*yield*/, session.getCurrentMediaSequenceSegments({ targetMseq: currVodCounts.vodMediaSeqVideo })];
                    case 3:
                        currVodSegments = _b.sent();
                        // Insert preroll if available for current channel
                        if (this.prerollsCache[this.sessionId]) {
                            prerollSegments = this.prerollsCache[this.sessionId].segments;
                            this._insertTimedMetadata(prerollSegments, scheduleObj.timedMetadata || {});
                            currVodSegments = this._mergeSegments(prerollSegments, currVodSegments, false);
                        }
                        // In risk that the SL-playhead might have updated some data after
                        // we reset last time... we should Reset SessionLive before sending new data.
                        return [4 /*yield*/, sessionLive.resetLiveStoreAsync(0)];
                    case 4:
                        // In risk that the SL-playhead might have updated some data after
                        // we reset last time... we should Reset SessionLive before sending new data.
                        _b.sent();
                        return [4 /*yield*/, sessionLive.setCurrentMediaAndDiscSequenceCount(currVodCounts.mediaSeq, currVodCounts.discSeq)];
                    case 5:
                        _b.sent();
                        return [4 /*yield*/, sessionLive.setCurrentMediaSequenceSegments(currVodSegments)];
                    case 6:
                        _b.sent();
                        return [4 /*yield*/, sessionLive.setLiveUri(scheduleObj.uri)];
                    case 7:
                        liveUri = _b.sent();
                        if (!liveUri) {
                            debug("[".concat(this.sessionId, "]: [ ERROR Switching from V2L->LIVE ]"));
                            this.working = false;
                            this.eventId = null;
                            return [2 /*return*/, false];
                        }
                        this.working = false;
                        this.streamTypeLive = true;
                        debug("[".concat(this.sessionId, "]: [ Switched from V2L->LIVE ]"));
                        return [2 /*return*/, true];
                    case 8:
                        err_4 = _b.sent();
                        this.streamTypeLive = false;
                        this.working = false;
                        this.eventId = null;
                        debug("[".concat(this.sessionId, "]: [ ERROR Switching from V2L->LIVE ]"));
                        console.error(err_4);
                        throw new Error(err_4);
                    case 9:
                        _b.trys.push([9, 17, , 18]);
                        debug("[".concat(this.sessionId, "]: [ INIT Switching from V2L->VOD ]"));
                        this.eventId = scheduleObj.eventId;
                        return [4 /*yield*/, session.getCurrentMediaAndDiscSequenceCount()];
                    case 10:
                        currVodCounts = _b.sent();
                        if (!scheduleObj.options) return [3 /*break*/, 12];
                        return [4 /*yield*/, session.getTruncatedVodSegmentsWithOptions(scheduleObj.uri, scheduleObj.duration / 1000, scheduleObj.options)];
                    case 11:
                        eventSegments = _b.sent();
                        return [3 /*break*/, 14];
                    case 12: return [4 /*yield*/, session.getTruncatedVodSegments(scheduleObj.uri, scheduleObj.duration / 1000)];
                    case 13:
                        eventSegments = _b.sent();
                        _b.label = 14;
                    case 14:
                        if (!eventSegments) {
                            debug("[".concat(this.sessionId, "]: [ ERROR Switching from V2L->VOD ]"));
                            this.working = false;
                            this.eventId = null;
                            return [2 /*return*/, false];
                        }
                        // Insert preroll if available for current channel
                        if (this.prerollsCache[this.sessionId]) {
                            prerollSegments = this.prerollsCache[this.sessionId].segments;
                            eventSegments = this._mergeSegments(prerollSegments, eventSegments, true);
                        }
                        return [4 /*yield*/, session.setCurrentMediaAndDiscSequenceCount(currVodCounts.mediaSeq, currVodCounts.discSeq)];
                    case 15:
                        _b.sent();
                        return [4 /*yield*/, session.setCurrentMediaSequenceSegments(eventSegments, 0, true)];
                    case 16:
                        _b.sent();
                        this.working = false;
                        debug("[".concat(this.sessionId, "]: [ Switched from V2L->VOD ]"));
                        return [2 /*return*/, false];
                    case 17:
                        err_5 = _b.sent();
                        this.streamTypeLive = false;
                        this.working = false;
                        this.eventId = null;
                        debug("[".concat(this.sessionId, "]: [ ERROR Switching from V2L->VOD ]"));
                        throw new Error(err_5);
                    case 18:
                        _b.trys.push([18, 24, , 25]);
                        debug("[".concat(this.sessionId, "]: [ INIT Switching from LIVE->V2L ]"));
                        this.eventId = null;
                        return [4 /*yield*/, sessionLive.getCurrentMediaSequenceSegments()];
                    case 19:
                        liveSegments = _b.sent();
                        return [4 /*yield*/, sessionLive.getCurrentMediaAndDiscSequenceCount()];
                    case 20:
                        liveCounts = _b.sent();
                        if (scheduleObj && !scheduleObj.duration) {
                            debug("[".concat(this.sessionId, "]: Cannot switch VOD. No duration specified for schedule item: [").concat(scheduleObj.assetId, "]"));
                        }
                        if (this._isEmpty(liveSegments.currMseqSegs)) {
                            this.working = false;
                            this.streamTypeLive = false;
                            debug("[".concat(this.sessionId, "]: [ Switched from LIVE->V2L ]"));
                            return [2 /*return*/, false];
                        }
                        // Insert preroll, if available, for current channel
                        if (this.prerollsCache[this.sessionId]) {
                            prerollSegments = this.prerollsCache[this.sessionId].segments;
                            liveSegments.currMseqSegs = this._mergeSegments(prerollSegments, liveSegments.currMseqSegs, false);
                            liveSegments.segCount += prerollSegments.length;
                        }
                        return [4 /*yield*/, session.setCurrentMediaAndDiscSequenceCount(liveCounts.mediaSeq, liveCounts.discSeq)];
                    case 21:
                        _b.sent();
                        return [4 /*yield*/, session.setCurrentMediaSequenceSegments(liveSegments.currMseqSegs, liveSegments.segCount)];
                    case 22:
                        _b.sent();
                        return [4 /*yield*/, sessionLive.resetSession()];
                    case 23:
                        _b.sent();
                        sessionLive.resetLiveStoreAsync(RESET_DELAY); // In parallel
                        this.working = false;
                        this.streamTypeLive = false;
                        debug("[".concat(this.sessionId, "]: [ Switched from LIVE->V2L ]"));
                        return [2 /*return*/, false];
                    case 24:
                        err_6 = _b.sent();
                        this.streamTypeLive = false;
                        this.working = false;
                        this.eventId = null;
                        debug("[".concat(this.sessionId, "]: [ ERROR Switching from LIVE->V2L ]"));
                        throw new Error(err_6);
                    case 25:
                        _b.trys.push([25, 33, , 34]);
                        debug("[".concat(this.sessionId, "]: INIT Switching from LIVE->VOD"));
                        // TODO: Not yet fully tested/supported
                        this.eventId = scheduleObj.eventId;
                        return [4 /*yield*/, sessionLive.getCurrentMediaSequenceSegments()];
                    case 26:
                        liveSegments = _b.sent();
                        return [4 /*yield*/, sessionLive.getCurrentMediaAndDiscSequenceCount()];
                    case 27:
                        liveCounts = _b.sent();
                        return [4 /*yield*/, session.getTruncatedVodSegments(scheduleObj.uri, scheduleObj.duration / 1000)];
                    case 28:
                        eventSegments = _b.sent();
                        if (!eventSegments) {
                            debug("[".concat(this.sessionId, "]: [ ERROR Switching from LIVE->VOD ]"));
                            this.streamTypeLive = false;
                            this.working = false;
                            this.eventId = null;
                            return [2 /*return*/, false];
                        }
                        return [4 /*yield*/, session.setCurrentMediaAndDiscSequenceCount(liveCounts.mediaSeq - 1, liveCounts.discSeq - 1)];
                    case 29:
                        _b.sent();
                        return [4 /*yield*/, session.setCurrentMediaSequenceSegments(liveSegments.currMseqSegs, liveSegments.segCount)];
                    case 30:
                        _b.sent();
                        // Insert preroll, if available, for current channel
                        if (this.prerollsCache[this.sessionId]) {
                            prerollSegments = this.prerollsCache[this.sessionId].segments;
                            eventSegments = this._mergeSegments(prerollSegments, eventSegments, true);
                        }
                        return [4 /*yield*/, session.setCurrentMediaSequenceSegments(eventSegments, 0, true)];
                    case 31:
                        _b.sent();
                        return [4 /*yield*/, sessionLive.resetSession()];
                    case 32:
                        _b.sent();
                        sessionLive.resetLiveStoreAsync(RESET_DELAY); // In parallel
                        this.working = false;
                        this.streamTypeLive = false;
                        debug("[".concat(this.sessionId, "]: Switched from LIVE->VOD"));
                        return [2 /*return*/, false];
                    case 33:
                        err_7 = _b.sent();
                        this.streamTypeLive = false;
                        this.working = false;
                        this.eventId = null;
                        debug("[".concat(this.sessionId, "]: [ ERROR Switching from LIVE->VOD ]"));
                        throw new Error(err_7);
                    case 34:
                        _b.trys.push([34, 42, , 43]);
                        debug("[".concat(this.sessionId, "]: INIT Switching from LIVE->LIVE"));
                        // TODO: Not yet fully tested/supported
                        this.eventId = scheduleObj.eventId;
                        return [4 /*yield*/, sessionLive.getCurrentMediaSequenceSegments()];
                    case 35:
                        eventSegments = _b.sent();
                        return [4 /*yield*/, sessionLive.getCurrentMediaAndDiscSequenceCount()];
                    case 36:
                        currLiveCounts = _b.sent();
                        return [4 /*yield*/, sessionLive.resetSession()];
                    case 37:
                        _b.sent();
                        return [4 /*yield*/, sessionLive.resetLiveStoreAsync(0)];
                    case 38:
                        _b.sent();
                        // Insert preroll, if available, for current channel
                        if (this.prerollsCache[this.sessionId]) {
                            prerollSegments = this.prerollsCache[this.sessionId].segments;
                            this._insertTimedMetadata(prerollSegments, scheduleObj.timedMetadata || {});
                            eventSegments.currMseqSegs = this._mergeSegments(prerollSegments, eventSegments.currMseqSegs, false);
                        }
                        return [4 /*yield*/, sessionLive.setCurrentMediaAndDiscSequenceCount(currLiveCounts.mediaSeq, currLiveCounts.discSeq)];
                    case 39:
                        _b.sent();
                        return [4 /*yield*/, sessionLive.setCurrentMediaSequenceSegments(eventSegments.currMseqSegs)];
                    case 40:
                        _b.sent();
                        return [4 /*yield*/, sessionLive.setLiveUri(scheduleObj.uri)];
                    case 41:
                        liveUri = _b.sent();
                        if (!liveUri) {
                            debug("[".concat(this.sessionId, "]: [ ERROR Switching from LIVE->LIVE ]"));
                            this.streamTypeLive = false;
                            this.working = false;
                            this.eventId = null;
                            return [2 /*return*/, false];
                        }
                        this.working = false;
                        debug("[".concat(this.sessionId, "]: Switched from LIVE->LIVE"));
                        return [2 /*return*/, true];
                    case 42:
                        err_8 = _b.sent();
                        this.streamTypeLive = false;
                        this.working = false;
                        this.eventId = null;
                        debug("[".concat(this.sessionId, "]: [ ERROR Switching from LIVE->LIVE ]"));
                        throw new Error(err_8);
                    case 43:
                        debug("[".concat(this.sessionId, "]: SwitcherState [").concat(state, "] not implemented"));
                        this.streamTypeLive = false;
                        this.working = false;
                        this.eventId = null;
                        return [2 /*return*/, false];
                }
            });
        });
    };
    StreamSwitcher.prototype._isEmpty = function (obj) {
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
    StreamSwitcher.prototype._validURI = function (uri) {
        return __awaiter(this, void 0, void 0, function () {
            var controller, timeout, online, err_9;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        controller = new AbortController();
                        timeout = setTimeout(function () {
                            debug("[".concat(_this.sessionId, "]: Request Timeout @ ").concat(uri));
                            controller.abort();
                        }, FAIL_TIMEOUT);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, 4, 5]);
                        return [4 /*yield*/, fetch(uri, { signal: controller.signal })];
                    case 2:
                        online = _a.sent();
                        if (online.status >= 200 && online.status < 300) {
                            return [2 /*return*/, true];
                        }
                        debug("[".concat(this.sessionId, "]: Failed to validate URI: ").concat(uri, "\nERROR! Returned Status Code: ").concat(online.status));
                        return [2 /*return*/, false];
                    case 3:
                        err_9 = _a.sent();
                        debug("[".concat(this.sessionId, "]: Failed to validate URI: ").concat(uri, "\nERROR: ").concat(err_9));
                        return [2 /*return*/, false];
                    case 4:
                        clearTimeout(timeout);
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    StreamSwitcher.prototype._loadPreroll = function (uri) {
        return __awaiter(this, void 0, void 0, function () {
            var prerollSegments, mediaM3UPlaylists, mediaURIs, m3u, i, streamItem, bw, mediaUri, bandwidths_1, loadMediaPromises_1, results, arbitraryBw, bandwidths, i, bw, _loop_1, k, err_10;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        prerollSegments = {};
                        mediaM3UPlaylists = {};
                        mediaURIs = {};
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 6, , 7]);
                        return [4 /*yield*/, this._fetchParseM3u8(uri)];
                    case 2:
                        m3u = _a.sent();
                        debug("[".concat(this.sessionId, "]: ...Fetched a New Preroll Slate Master Manifest from:\n").concat(uri));
                        if (!(m3u.items.StreamItem.length > 0)) return [3 /*break*/, 4];
                        // Process Master M3U. Collect Media URIs
                        for (i = 0; i < m3u.items.StreamItem.length; i++) {
                            streamItem = m3u.items.StreamItem[i];
                            bw = streamItem.get("bandwidth");
                            mediaUri = streamItem.get("uri");
                            if (mediaUri.match("^http")) {
                                mediaURIs[bw] = mediaUri;
                            }
                            else {
                                mediaURIs[bw] = new URL(mediaUri, uri).href;
                            }
                        }
                        bandwidths_1 = Object.keys(mediaURIs);
                        loadMediaPromises_1 = [];
                        // Queue up...
                        bandwidths_1.forEach(function (bw) { return loadMediaPromises_1.push(_this._fetchParseM3u8(mediaURIs[bw])); });
                        return [4 /*yield*/, Promise.allSettled(loadMediaPromises_1)];
                    case 3:
                        results = _a.sent();
                        // Process...
                        results.forEach(function (item, idx) {
                            if (item.status === "fulfilled" && item.value) {
                                var resultM3U = item.value;
                                var bw = bandwidths_1[idx];
                                mediaM3UPlaylists[bw] = resultM3U.items.PlaylistItem;
                            }
                        });
                        return [3 /*break*/, 5];
                    case 4:
                        if (m3u.items.PlaylistItem.length > 0) {
                            arbitraryBw = 1;
                            mediaURIs[arbitraryBw] = uri;
                            mediaM3UPlaylists[arbitraryBw] = m3u.items.PlaylistItem;
                        }
                        else {
                            debug("[".concat(this.sessionId, "]: WARNING! M3U has no variants nor playlist segments!"));
                        }
                        _a.label = 5;
                    case 5:
                        bandwidths = Object.keys(mediaM3UPlaylists);
                        for (i = 0; i < bandwidths.length; i++) {
                            bw = bandwidths[i];
                            if (!prerollSegments[bw]) {
                                prerollSegments[bw] = [];
                            }
                            _loop_1 = function (k) {
                                var seg = {};
                                var playlistItem = mediaM3UPlaylists[bw][k];
                                var segmentUri = void 0;
                                var cueData = null;
                                var daterangeData = null;
                                var attributes = playlistItem["attributes"].attributes;
                                if (playlistItem.properties.discontinuity) {
                                    prerollSegments[bw].push({ discontinuity: true });
                                }
                                if ("cuein" in attributes) {
                                    if (!cueData) {
                                        cueData = {};
                                    }
                                    cueData["in"] = true;
                                }
                                if ("cueout" in attributes) {
                                    if (!cueData) {
                                        cueData = {};
                                    }
                                    cueData["out"] = true;
                                    cueData["duration"] = attributes["cueout"];
                                }
                                if ("cuecont" in attributes) {
                                    if (!cueData) {
                                        cueData = {};
                                    }
                                    cueData["cont"] = true;
                                }
                                if ("scteData" in attributes) {
                                    if (!cueData) {
                                        cueData = {};
                                    }
                                    cueData["scteData"] = attributes["scteData"];
                                }
                                if ("assetData" in attributes) {
                                    if (!cueData) {
                                        cueData = {};
                                    }
                                    cueData["assetData"] = attributes["assetData"];
                                }
                                if ("daterange" in attributes) {
                                    if (!daterangeData) {
                                        daterangeData = {};
                                    }
                                    var allDaterangeAttributes = Object.keys(attributes["daterange"]);
                                    allDaterangeAttributes.forEach(function (attr) {
                                        if (attr.match(/DURATION$/)) {
                                            daterangeData[attr.toLowerCase()] = parseFloat(attributes["daterange"][attr]);
                                        }
                                        else {
                                            daterangeData[attr.toLowerCase()] = attributes["daterange"][attr];
                                        }
                                    });
                                }
                                if (playlistItem.properties.uri) {
                                    if (playlistItem.properties.uri.match("^http")) {
                                        segmentUri = playlistItem.properties.uri;
                                    }
                                    else {
                                        segmentUri = new URL(playlistItem.properties.uri, mediaURIs[bw]).href;
                                    }
                                    seg["duration"] = playlistItem.properties.duration;
                                    seg["uri"] = segmentUri;
                                    seg["cue"] = cueData;
                                    if (daterangeData) {
                                        seg["daterange"] = daterangeData;
                                    }
                                }
                                prerollSegments[bw].push(seg);
                            };
                            for (k = 0; k < mediaM3UPlaylists[bw].length; k++) {
                                _loop_1(k);
                            }
                        }
                        debug("[".concat(this.sessionId, "]: Loaded all Variants of the Preroll Slate!"));
                        return [2 /*return*/, prerollSegments];
                    case 6:
                        err_10 = _a.sent();
                        throw new Error(err_10);
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    // Input: hls vod uri. Output: an M3U object.
    StreamSwitcher.prototype._fetchParseM3u8 = function (uri) {
        return __awaiter(this, void 0, void 0, function () {
            var parser, res, err_11;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        parser = m3u8.createStream();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, fetchWithRetry(uri, {}, 5, 1000, 1500, debug)];
                    case 2:
                        res = _a.sent();
                        res.body.pipe(parser);
                        return [2 /*return*/, new Promise(function (resolve, reject) {
                                parser.on("m3u", function (m3u) {
                                    resolve(m3u);
                                    parser.on("error", function (exc) {
                                        debug("Parser Error: ".concat(JSON.stringify(exc)));
                                        reject(exc);
                                    });
                                });
                            })];
                    case 3:
                        err_11 = _a.sent();
                        return [2 /*return*/, Promise.reject("[".concat(this.sessionId, "]: Failed to Fetch URI: ").concat(uri, "\nERROR, ").concat(err_11))];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    StreamSwitcher.prototype._mergeSegments = function (fromSegments, toSegments, prepend) {
        var OUTPUT_SEGMENTS = {};
        var fromBws = Object.keys(fromSegments);
        var toBws = Object.keys(toSegments);
        toBws.forEach(function (bw) {
            var targetBw = findNearestValue(bw, fromBws);
            if (prepend) {
                OUTPUT_SEGMENTS[bw] = fromSegments[targetBw].concat(toSegments[bw]);
                OUTPUT_SEGMENTS[bw].unshift({ discontinuity: true });
            }
            else {
                var lastSeg = toSegments[bw][toSegments[bw].length - 1];
                if (lastSeg.uri && !lastSeg.discontinuity) {
                    toSegments[bw].push({ discontinuity: true, cue: { in: true } });
                    OUTPUT_SEGMENTS[bw] = toSegments[bw].concat(fromSegments[targetBw]);
                }
                else if (lastSeg.discontinuity && !lastSeg.cue) {
                    toSegments[bw][toSegments[bw].length - 1].cue = { in: true };
                    OUTPUT_SEGMENTS[bw] = toSegments[bw].concat(fromSegments[targetBw]);
                }
                else {
                    OUTPUT_SEGMENTS[bw] = toSegments[bw].concat(fromSegments[targetBw]);
                    OUTPUT_SEGMENTS[bw].push({ discontinuity: true });
                }
            }
        });
        return OUTPUT_SEGMENTS;
    };
    StreamSwitcher.prototype._insertTimedMetadata = function (segments, timedMetadata) {
        var bandwidths = Object.keys(segments);
        debug("[".concat(this.sessionId, "]: Inserting timed metadata ").concat(Object.keys(timedMetadata).join(',')));
        bandwidths.forEach(function (bw) {
            var daterangeData = segments[bw][0]["daterange"];
            if (!daterangeData) {
                daterangeData = {};
                Object.keys(timedMetadata).forEach(function (k) {
                    daterangeData[k] = timedMetadata[k];
                });
            }
            segments[bw][0]["daterange"] = daterangeData;
        });
    };
    return StreamSwitcher;
}());
module.exports = StreamSwitcher;
