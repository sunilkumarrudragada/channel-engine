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
var debug = require("debug")("engine-session-live");
var allSettled = require("promise.allsettled");
var crypto = require("crypto");
var m3u8 = require("@eyevinn/m3u8");
var url = require("url");
var fetch = require("node-fetch");
var m3u8Header = require("./util.js").m3u8Header;
var AbortController = require("abort-controller").AbortController;
var timer = function (ms) { return new Promise(function (res) { return setTimeout(res, ms); }); };
var daterangeAttribute = function (key, attr) {
    if (key === "planned-duration" || key === "duration") {
        return key.toUpperCase() + "=" + "".concat(attr.toFixed(3));
    }
    else {
        return key.toUpperCase() + "=" + "\"".concat(attr, "\"");
    }
};
var TARGET_PLAYLIST_DURATION_SEC = 60;
var RESET_DELAY = 5000;
var FAIL_TIMEOUT = 4000;
var DEFAULT_PLAYHEAD_INTERVAL_MS = 6 * 1000;
var PlayheadState = Object.freeze({
    RUNNING: 1,
    STOPPED: 2,
    CRASHED: 3,
    IDLE: 4,
});
var SessionLive = /** @class */ (function () {
    function SessionLive(config, sessionLiveStore) {
        this.sessionId = crypto.randomBytes(20).toString("hex");
        this.sessionLiveStateStore = sessionLiveStore.sessionLiveStateStore;
        this.instanceId = sessionLiveStore.instanceId;
        this.mediaSeqCount = 0;
        this.prevMediaSeqCount = 0;
        this.discSeqCount = 0;
        this.prevDiscSeqCount = 0;
        this.targetDuration = 0;
        this.masterManifestUri = null;
        this.vodSegments = {};
        this.mediaManifestURIs = {};
        this.liveSegQueue = {};
        this.lastRequestedMediaSeqRaw = null;
        this.liveSourceM3Us = {};
        this.playheadState = PlayheadState.IDLE;
        this.liveSegsForFollowers = {};
        this.timerCompensation = null;
        this.firstTime = true;
        this.allowedToSet = false;
        this.pushAmount = 0;
        this.restAmount = 0;
        this.waitForPlayhead = true;
        this.blockGenerateManifest = false;
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
            if (config.profile) {
                this.sessionLiveProfile = config.profile;
            }
        }
    }
    SessionLive.prototype.initAsync = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = this;
                        return [4 /*yield*/, this.sessionLiveStateStore.create(this.sessionId, this.instanceId)];
                    case 1:
                        _a.sessionLiveState = _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     *
     * @param {number} resetDelay The amount of time to wait before resetting the session.
     *
     */
    SessionLive.prototype.resetLiveStoreAsync = function (resetDelay) {
        return __awaiter(this, void 0, void 0, function () {
            var isLeader;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.sessionLiveStateStore.isLeader(this.instanceId)];
                    case 1:
                        isLeader = _a.sent();
                        if (!isLeader) {
                            return [2 /*return*/];
                        }
                        if (resetDelay === null || resetDelay < 0) {
                            resetDelay = RESET_DELAY;
                        }
                        debug("[".concat(this.instanceId, "][").concat(this.sessionId, "]: LEADER: Resetting SessionLive values in Store ").concat(resetDelay === 0 ? "Immediately" : "after a delay=(".concat(resetDelay, "ms)")));
                        return [4 /*yield*/, timer(resetDelay)];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, this.sessionLiveState.set("liveSegsForFollowers", null)];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, this.sessionLiveState.set("lastRequestedMediaSeqRaw", null)];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, this.sessionLiveState.set("transitSegs", null)];
                    case 5:
                        _a.sent();
                        return [4 /*yield*/, this.sessionLiveState.set("firstCounts", {
                                liveSourceMseqCount: null,
                                mediaSeqCount: null,
                                discSeqCount: null,
                            })];
                    case 6:
                        _a.sent();
                        debug("[".concat(this.instanceId, "][").concat(this.sessionId, "]: LEADER: SessionLive values in Store have now been reset!"));
                        return [2 /*return*/];
                }
            });
        });
    };
    SessionLive.prototype.resetSession = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.waitForPlayhead) return [3 /*break*/, 2];
                        debug("[".concat(this.sessionId, "]: SessionLive RESET requested. Waiting for Playhead to finish a parse job."));
                        return [4 /*yield*/, timer(1000)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 0];
                    case 2:
                        this.mediaSeqCount = 0;
                        this.prevMediaSeqCount = 0;
                        this.discSeqCount = 0;
                        this.targetDuration = 0;
                        this.masterManifestUri = null;
                        this.vodSegments = {};
                        this.mediaManifestURIs = {};
                        this.liveSegQueue = {};
                        this.lastRequestedMediaSeqRaw = null;
                        this.liveSourceM3Us = {};
                        this.liveSegsForFollowers = {};
                        this.timerCompensation = null;
                        this.firstTime = true;
                        this.pushAmount = 0;
                        this.allowedToSet = false;
                        this.waitForPlayhead = true;
                        this.blockGenerateManifest = false;
                        debug("[".concat(this.instanceId, "][").concat(this.sessionId, "]: Resetting all property values in sessionLive"));
                        return [2 /*return*/];
                }
            });
        });
    };
    SessionLive.prototype.startPlayheadAsync = function () {
        return __awaiter(this, void 0, void 0, function () {
            var tsIncrementBegin, tsIncrementEnd, liveSegmentDurationMs, timerValueMs, isLeader, incrementDuration, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        debug("[".concat(this.sessionId, "]: SessionLive-Playhead consumer started"));
                        this.playheadState = PlayheadState.RUNNING;
                        _a.label = 1;
                    case 1:
                        if (!(this.playheadState !== PlayheadState.CRASHED)) return [3 /*break*/, 14];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 12, , 13]);
                        this.timerCompensation = true;
                        if (!!this.masterManifestUri) return [3 /*break*/, 4];
                        return [4 /*yield*/, timer(3000)];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 1];
                    case 4:
                        if (!(this.playheadState === PlayheadState.STOPPED)) return [3 /*break*/, 6];
                        debug("[".concat(this.sessionId, "]: Playhead has Stopped, clearing local session and store."));
                        this.waitForPlayhead = false;
                        return [4 /*yield*/, this.resetSession()];
                    case 5:
                        _a.sent();
                        this.resetLiveStoreAsync(RESET_DELAY);
                        return [2 /*return*/];
                    case 6:
                        // Fetch Live-Source Segments, and get ready for on-the-fly manifest generation
                        // And also compensate for processing time
                        this.waitForPlayhead = true;
                        tsIncrementBegin = Date.now();
                        return [4 /*yield*/, this._loadAllMediaManifests()];
                    case 7:
                        _a.sent();
                        tsIncrementEnd = Date.now();
                        this.waitForPlayhead = false;
                        liveSegmentDurationMs = this._getAnyFirstSegmentDurationMs() || DEFAULT_PLAYHEAD_INTERVAL_MS;
                        timerValueMs = 0;
                        if (!this.timerCompensation) return [3 /*break*/, 9];
                        return [4 /*yield*/, this.sessionLiveStateStore.isLeader(this.instanceId)];
                    case 8:
                        isLeader = _a.sent();
                        incrementDuration = tsIncrementEnd - tsIncrementBegin;
                        if (incrementDuration >= liveSegmentDurationMs * 0.5 && isLeader) {
                            timerValueMs = liveSegmentDurationMs;
                        }
                        else {
                            timerValueMs = liveSegmentDurationMs - (tsIncrementEnd - tsIncrementBegin);
                        }
                        return [3 /*break*/, 10];
                    case 9:
                        // DO NOT compensate if manifest fetching was out-of-sync
                        // It means that Live Source and Channel-Engine were awkwardly time-synced
                        timerValueMs = liveSegmentDurationMs;
                        _a.label = 10;
                    case 10:
                        debug("[".concat(this.sessionId, "]: SessionLive-Playhead going to ping again after ").concat(timerValueMs, "ms"));
                        return [4 /*yield*/, timer(timerValueMs)];
                    case 11:
                        _a.sent();
                        return [3 /*break*/, 13];
                    case 12:
                        err_1 = _a.sent();
                        debug("[".concat(this.sessionId, "]: SessionLive-Playhead consumer crashed"));
                        console.error("[".concat(this.sessionId, "]: ").concat(err_1.message));
                        debug(err_1);
                        this.playheadState = PlayheadState.CRASHED;
                        return [3 /*break*/, 13];
                    case 13: return [3 /*break*/, 1];
                    case 14: return [2 /*return*/];
                }
            });
        });
    };
    SessionLive.prototype.restartPlayheadAsync = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        debug("[".concat(this.sessionId, "]: Restarting sessionLive-playhead consumer"));
                        return [4 /*yield*/, this.startPlayheadAsync()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    SessionLive.prototype.stopPlayheadAsync = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                debug("[".concat(this.sessionId, "]: Stopping sessionLive-playhead consumer"));
                this.playheadState = PlayheadState.STOPPED;
                return [2 /*return*/];
            });
        });
    };
    /**
     * This function sets the master manifest URI in sessionLive.
     * @param {string} masterManifestUri The master manifest URI.
     * @returns a boolean indicating whether the master manifest URI is reachable or not.
     */
    SessionLive.prototype.setLiveUri = function (masterManifestUri) {
        return __awaiter(this, void 0, void 0, function () {
            var attempts, err_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (masterManifestUri === null) {
                            debug("[".concat(this.sessionId, "]: No Live URI provided."));
                            return [2 /*return*/, false];
                        }
                        attempts = 3;
                        _a.label = 1;
                    case 1:
                        if (!(!this.masterManifestUri && attempts > 0)) return [3 /*break*/, 7];
                        attempts--;
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 6]);
                        debug("[".concat(this.instanceId, "][").concat(this.sessionId, "]: Going to fetch Live Master Manifest!"));
                        // Load & Parse all Media Manifest URIs from Master
                        return [4 /*yield*/, this._loadMasterManifest(masterManifestUri)];
                    case 3:
                        // Load & Parse all Media Manifest URIs from Master
                        _a.sent();
                        this.masterManifestUri = masterManifestUri;
                        if (this.sessionLiveProfile) {
                            this._filterLiveProfiles();
                            debug("[".concat(this.sessionId, "]: Filtered Live profiles! (").concat(Object.keys(this.mediaManifestURIs).length, ") profiles left!"));
                        }
                        return [3 /*break*/, 6];
                    case 4:
                        err_2 = _a.sent();
                        this.masterManifestUri = null;
                        debug("[".concat(this.instanceId, "][").concat(this.sessionId, "]: Failed to fetch Live Master Manifest! ").concat(err_2));
                        debug("[".concat(this.instanceId, "][").concat(this.sessionId, "]: Will try again in 1000ms! (tries left=").concat(attempts, ")"));
                        return [4 /*yield*/, timer(1000)];
                    case 5:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 6:
                        // To make sure certain operations only occur once.
                        this.firstTime = true;
                        return [3 /*break*/, 1];
                    case 7:
                        // Return whether job was successful or not.
                        if (!this.masterManifestUri) {
                            return [2 /*return*/, false];
                        }
                        return [2 /*return*/, true];
                }
            });
        });
    };
    SessionLive.prototype.setCurrentMediaSequenceSegments = function (segments) {
        return __awaiter(this, void 0, void 0, function () {
            var allBws, i, bw, cueInExists, segIdx, v2lSegment, endIdx, finalSegItem, isLeader;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (segments === null) {
                            debug("[".concat(this.sessionId, "]: No segments provided."));
                            return [2 /*return*/, false];
                        }
                        // Make it possible to add & share new segments
                        this.allowedToSet = true;
                        allBws = Object.keys(segments);
                        if (this._isEmpty(this.vodSegments)) {
                            for (i = 0; i < allBws.length; i++) {
                                bw = allBws[i];
                                if (!this.vodSegments[bw]) {
                                    this.vodSegments[bw] = [];
                                }
                                if (segments[bw][0].discontinuity) {
                                    segments[bw].shift();
                                }
                                cueInExists = null;
                                for (segIdx = 0; segIdx < segments[bw].length; segIdx++) {
                                    v2lSegment = segments[bw][segIdx];
                                    if (v2lSegment.cue) {
                                        if (v2lSegment.cue["in"]) {
                                            cueInExists = true;
                                        }
                                        else {
                                            cueInExists = false;
                                        }
                                    }
                                    this.vodSegments[bw].push(v2lSegment);
                                }
                                endIdx = segments[bw].length - 1;
                                if (!segments[bw][endIdx].discontinuity) {
                                    finalSegItem = { discontinuity: true };
                                    if (!cueInExists) {
                                        finalSegItem["cue"] = { in: true };
                                    }
                                    this.vodSegments[bw].push(finalSegItem);
                                }
                                else {
                                    if (!cueInExists) {
                                        segments[bw][endIdx]["cue"] = { in: true };
                                    }
                                }
                            }
                        }
                        else {
                            debug("[".concat(this.sessionId, "]: 'vodSegments' not empty = Using 'transitSegs'"));
                        }
                        debug("[".concat(this.sessionId, "]: Setting CurrentMediaSequenceSegments. First seg is: [").concat(this.vodSegments[Object.keys(this.vodSegments)[0]][0].uri, "]"));
                        return [4 /*yield*/, this.sessionLiveStateStore.isLeader(this.instanceId)];
                    case 1:
                        isLeader = _a.sent();
                        if (!isLeader) return [3 /*break*/, 3];
                        //debug(`[${this.sessionId}]: LEADER: I am adding 'transitSegs'=${JSON.stringify(this.vodSegments)} to Store for future followers`);
                        return [4 /*yield*/, this.sessionLiveState.set("transitSegs", this.vodSegments)];
                    case 2:
                        //debug(`[${this.sessionId}]: LEADER: I am adding 'transitSegs'=${JSON.stringify(this.vodSegments)} to Store for future followers`);
                        _a.sent();
                        debug("[".concat(this.sessionId, "]: LEADER: I am adding 'transitSegs' to Store for future followers"));
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    SessionLive.prototype.setCurrentMediaAndDiscSequenceCount = function (mediaSeq, discSeq) {
        return __awaiter(this, void 0, void 0, function () {
            var isLeader, liveCounts, leadersMediaSeqCount, leadersDiscSeqCount, transitSegs;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (mediaSeq === null || discSeq === null) {
                            debug("[".concat(this.sessionId, "]: No media or disc sequence provided"));
                            return [2 /*return*/, false];
                        }
                        debug("[".concat(this.sessionId, "]: Setting mediaSeqCount and discSeqCount to: [").concat(mediaSeq, "]:[").concat(discSeq, "]"));
                        this.mediaSeqCount = mediaSeq;
                        this.discSeqCount = discSeq;
                        return [4 /*yield*/, this.sessionLiveStateStore.isLeader(this.instanceId)];
                    case 1:
                        isLeader = _a.sent();
                        return [4 /*yield*/, this.sessionLiveState.get("firstCounts")];
                    case 2:
                        liveCounts = _a.sent();
                        if (liveCounts === null) {
                            liveCounts = {
                                liveSourceMseqCount: null,
                                mediaSeqCount: null,
                                discSeqCount: null,
                            };
                        }
                        if (!isLeader) return [3 /*break*/, 4];
                        liveCounts.discSeqCount = this.discSeqCount;
                        return [4 /*yield*/, this.sessionLiveState.set("firstCounts", liveCounts)];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 4:
                        leadersMediaSeqCount = liveCounts.mediaSeqCount;
                        leadersDiscSeqCount = liveCounts.discSeqCount;
                        if (!(leadersMediaSeqCount !== null)) return [3 /*break*/, 6];
                        this.mediaSeqCount = leadersMediaSeqCount;
                        debug("[".concat(this.sessionId, "]: Setting mediaSeqCount to: [").concat(this.mediaSeqCount, "]"));
                        return [4 /*yield*/, this.sessionLiveState.get("transitSegs")];
                    case 5:
                        transitSegs = _a.sent();
                        if (!this._isEmpty(transitSegs)) {
                            debug("[".concat(this.sessionId, "]: Getting and loading 'transitSegs'"));
                            this.vodSegments = transitSegs;
                        }
                        _a.label = 6;
                    case 6:
                        if (leadersDiscSeqCount !== null) {
                            this.discSeqCount = leadersDiscSeqCount;
                            debug("[".concat(this.sessionId, "]: Setting discSeqCount to: [").concat(this.discSeqCount, "]"));
                        }
                        _a.label = 7;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    SessionLive.prototype.getTransitionalSegments = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.vodSegments];
            });
        });
    };
    SessionLive.prototype.getCurrentMediaSequenceSegments = function () {
        return __awaiter(this, void 0, void 0, function () {
            var isLeader, leadersMediaSeqRaw, _a, currentMediaSequenceSegments, segmentCount, increment, i, bw, liveTargetBandwidth, vodTargetBandwidth;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        /**
                         * Might be possible that a follower sends segments to Session
                         * BEFORE Leader finished fetching new segs and sending segs himself.
                         * As long as Leader sends same segs to session as Follower even though Leader
                         * is trying to get new segs, it should be fine!
                         **/
                        this.allowedToSet = false;
                        return [4 /*yield*/, this.sessionLiveStateStore.isLeader(this.instanceId)];
                    case 1:
                        isLeader = _b.sent();
                        if (!!isLeader) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.sessionLiveState.get("lastRequestedMediaSeqRaw")];
                    case 2:
                        leadersMediaSeqRaw = _b.sent();
                        if (!(leadersMediaSeqRaw > this.lastRequestedMediaSeqRaw)) return [3 /*break*/, 4];
                        this.lastRequestedMediaSeqRaw = leadersMediaSeqRaw;
                        _a = this;
                        return [4 /*yield*/, this.sessionLiveState.get("liveSegsForFollowers")];
                    case 3:
                        _a.liveSegsForFollowers = _b.sent();
                        this._updateLiveSegQueue();
                        _b.label = 4;
                    case 4:
                        currentMediaSequenceSegments = {};
                        segmentCount = 0;
                        increment = 0;
                        for (i = 0; i < Object.keys(this.mediaManifestURIs).length; i++) {
                            bw = Object.keys(this.mediaManifestURIs)[i];
                            liveTargetBandwidth = this._findNearestBw(bw, Object.keys(this.mediaManifestURIs));
                            vodTargetBandwidth = this._getNearestBandwidth(bw, Object.keys(this.vodSegments));
                            // Remove segments and disc-tag if they are on top
                            if (this.vodSegments[vodTargetBandwidth].length > 0 && this.vodSegments[vodTargetBandwidth][0].discontinuity) {
                                this.vodSegments[vodTargetBandwidth].shift();
                                increment = 1;
                            }
                            segmentCount = this.vodSegments[vodTargetBandwidth].length;
                            currentMediaSequenceSegments[liveTargetBandwidth] = [];
                            // In case we switch back before we've depleted all transitional segments
                            currentMediaSequenceSegments[liveTargetBandwidth] = this.vodSegments[vodTargetBandwidth].concat(this.liveSegQueue[liveTargetBandwidth]);
                            currentMediaSequenceSegments[liveTargetBandwidth].push({ discontinuity: true, cue: { in: true } });
                            debug("[".concat(this.sessionId, "]: Getting current media segments for bw=").concat(bw));
                        }
                        this.discSeqCount += increment;
                        return [2 /*return*/, {
                                currMseqSegs: currentMediaSequenceSegments,
                                segCount: segmentCount,
                            }];
                }
            });
        });
    };
    SessionLive.prototype.getCurrentMediaAndDiscSequenceCount = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, {
                        mediaSeq: this.mediaSeqCount,
                        discSeq: this.discSeqCount,
                    }];
            });
        });
    };
    SessionLive.prototype.getStatus = function () {
        var playheadStateMap = {};
        playheadStateMap[PlayheadState.IDLE] = "idle";
        playheadStateMap[PlayheadState.RUNNING] = "running";
        playheadStateMap[PlayheadState.CRASHED] = "crashed";
        playheadStateMap[PlayheadState.STOPPED] = "stopped";
        var status = {
            sessionId: this.sessionId,
            playhead: {
                state: playheadStateMap[this.playheadState],
            },
        };
        return status;
    };
    // Generate manifest to give to client
    SessionLive.prototype.getCurrentMediaManifestAsync = function (bw) {
        return __awaiter(this, void 0, void 0, function () {
            var attempts, m3u8, exc_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.sessionLiveState) {
                            throw new Error("SessionLive not ready");
                        }
                        if (bw === null) {
                            debug("[".concat(this.sessionId, "]: No bandwidth provided"));
                            return [2 /*return*/, null];
                        }
                        debug("[".concat(this.sessionId, "]: ...Loading the selected Live Media Manifest"));
                        attempts = 10;
                        m3u8 = null;
                        _a.label = 1;
                    case 1:
                        if (!(!m3u8 && attempts > 0)) return [3 /*break*/, 8];
                        attempts--;
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 6, , 7]);
                        return [4 /*yield*/, this._GenerateLiveManifest(bw)];
                    case 3:
                        m3u8 = _a.sent();
                        if (!!m3u8) return [3 /*break*/, 5];
                        debug("[".concat(this.sessionId, "]: No manifest available yet, will try again after 1000ms"));
                        return [4 /*yield*/, timer(1000)];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5: return [3 /*break*/, 7];
                    case 6:
                        exc_1 = _a.sent();
                        throw new Error("[".concat(this.instanceId, "][").concat(this.sessionId, "]: Failed to generate manifest. Live Session might have ended already. \n").concat(exc_1));
                    case 7: return [3 /*break*/, 1];
                    case 8:
                        if (!m3u8) {
                            throw new Error("[".concat(this.instanceId, "][").concat(this.sessionId, "]: Failed to generate manifest after 10000ms"));
                        }
                        return [2 /*return*/, m3u8];
                }
            });
        });
    };
    // TODO: Implement this later
    SessionLive.prototype.getCurrentAudioManifestAsync = function (audioGroupId, audioLanguage) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                debug("[".concat(this.sessionId, "]: getCurrentAudioManifestAsync is NOT Implemented"));
                return [2 /*return*/, "Not Implemented"];
            });
        });
    };
    SessionLive.prototype.getCurrentSubtitleManifestAsync = function (subtitleGroupId, subtitleLanguage) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                debug("[".concat(this.sessionId, "]: getCurrentSubtitleManifestAsync is NOT Implemented"));
                return [2 /*return*/, "Not Implemented"];
            });
        });
    };
    /**
     *
     * @param {string} masterManifestURI The master manifest URI.
     * @returns Loads the URIs to the different media playlists from the given master playlist.
     *
     */
    SessionLive.prototype._loadMasterManifest = function (masterManifestURI) {
        return __awaiter(this, void 0, void 0, function () {
            var parser, controller, timeout, response;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (masterManifestURI === null) {
                            throw new Error("[".concat(this.instanceId, "][").concat(this.sessionId, "]: No masterManifestURI provided"));
                        }
                        parser = m3u8.createStream();
                        controller = new AbortController();
                        timeout = setTimeout(function () {
                            debug("[".concat(_this.sessionId, "]: Request Timeout! Aborting Request to ").concat(masterManifestURI));
                            controller.abort();
                        }, FAIL_TIMEOUT);
                        return [4 /*yield*/, fetch(masterManifestURI, { signal: controller.signal })];
                    case 1:
                        response = _a.sent();
                        try {
                            response.body.pipe(parser);
                        }
                        catch (err) {
                            debug("[".concat(this.sessionId, "]: Error when piping response to parser! ").concat(JSON.stringify(err)));
                            return [2 /*return*/, Promise.reject(err)];
                        }
                        finally {
                            clearTimeout(timeout);
                        }
                        return [2 /*return*/, new Promise(function (resolve, reject) {
                                parser.on("m3u", function (m3u) {
                                    debug("[".concat(_this.sessionId, "]: ...Fetched a New Live Master Manifest from:\n").concat(masterManifestURI));
                                    var baseUrl = "";
                                    var m = masterManifestURI.match(/^(.*)\/.*?$/);
                                    if (m) {
                                        baseUrl = m[1] + "/";
                                    }
                                    // Get all Profile manifest URIs in the Live Master Manifest
                                    for (var i = 0; i < m3u.items.StreamItem.length; i++) {
                                        var streamItem = m3u.items.StreamItem[i];
                                        var streamItemBW = streamItem.get("bandwidth");
                                        var mediaManifestUri = url.resolve(baseUrl, streamItem.get("uri"));
                                        if (!_this.mediaManifestURIs[streamItemBW]) {
                                            _this.mediaManifestURIs[streamItemBW] = "";
                                        }
                                        _this.mediaManifestURIs[streamItemBW] = mediaManifestUri;
                                    }
                                    debug("[".concat(_this.sessionId, "]: All Live Media Manifest URIs have been collected. (").concat(Object.keys(_this.mediaManifestURIs).length, ") profiles found!"));
                                    resolve();
                                    parser.on("error", function (exc) {
                                        debug("Parser Error: ".concat(JSON.stringify(exc)));
                                        reject(exc);
                                    });
                                });
                            })];
                }
            });
        });
    };
    // FOLLOWER only function
    SessionLive.prototype._updateLiveSegQueue = function () {
        if (Object.keys(this.liveSegsForFollowers).length === 0) {
            debug("[".concat(this.sessionId, "]: FOLLOWER: Error No Segments found at all."));
        }
        var liveBws = Object.keys(this.liveSegsForFollowers);
        var size = this.liveSegsForFollowers[liveBws[0]].length;
        // Push the New Live Segments to All Variants
        for (var segIdx = 0; segIdx < size; segIdx++) {
            for (var i = 0; i < liveBws.length; i++) {
                var liveBw = liveBws[i];
                var liveSegFromLeader = this.liveSegsForFollowers[liveBw][segIdx];
                if (!this.liveSegQueue[liveBw]) {
                    this.liveSegQueue[liveBw] = [];
                }
                // Do not push duplicates
                var liveSegURIs = this.liveSegQueue[liveBw].filter(function (seg) { return seg.uri; }).map(function (seg) { return seg.uri; });
                if (liveSegFromLeader.uri && liveSegURIs.includes(liveSegFromLeader.uri)) {
                    debug("[".concat(this.sessionId, "]: FOLLOWER: Found duplicate live segment. Skip push! (").concat(liveBw, ")"));
                }
                else {
                    this.liveSegQueue[liveBw].push(liveSegFromLeader);
                    debug("[".concat(this.sessionId, "]: FOLLOWER: Pushed segment (").concat(liveSegFromLeader.uri ? liveSegFromLeader.uri : "Disc-tag", ") to 'liveSegQueue' (").concat(liveBw, ")"));
                }
            }
        }
        // Remove older segments and update counts
        var newTotalDuration = this._incrementAndShift("FOLLOWER");
        if (newTotalDuration) {
            debug("[".concat(this.sessionId, "]: FOLLOWER: New Adjusted Playlist Duration=").concat(newTotalDuration, "s"));
        }
    };
    /**
     * This function adds new live segments to the node from which it can
     * generate new manifests from. Method for attaining new segments differ
     * depending on node Rank. The Leader collects from live source and
     * Followers collect from shared storage.
     *
     * @returns Nothing, but gives data to certain class-variables
     */
    SessionLive.prototype._loadAllMediaManifests = function () {
        return __awaiter(this, void 0, void 0, function () {
            var currentMseqRaw, isLeader, leadersMediaSeqRaw, attempts, segDur, waitTimeMs, liveSegsInStore, segDur, waitTimeMs, FETCH_ATTEMPTS, bandwidthsToSkipOnRetry, _loop_1, this_1, state_1, leadersCurrentMseqRaw, counts, leadersFirstMseqRaw, _a, pushPromises, i, bw, leaderORFollower, newTotalDuration, liveBws, segListSize, firstCounts;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        debug("[".concat(this.sessionId, "]: Attempting to load all media manifest URIs in=").concat(Object.keys(this.mediaManifestURIs)));
                        currentMseqRaw = null;
                        return [4 /*yield*/, this.sessionLiveStateStore.isLeader(this.instanceId)];
                    case 1:
                        isLeader = _b.sent();
                        if (!(!isLeader && this.lastRequestedMediaSeqRaw !== null)) return [3 /*break*/, 17];
                        debug("[".concat(this.sessionId, "]: FOLLOWER: Reading data from store!"));
                        return [4 /*yield*/, this.sessionLiveState.get("lastRequestedMediaSeqRaw")];
                    case 2:
                        leadersMediaSeqRaw = _b.sent();
                        if (!leadersMediaSeqRaw < this.lastRequestedMediaSeqRaw && this.blockGenerateManifest) {
                            this.blockGenerateManifest = false;
                        }
                        attempts = 10;
                        _b.label = 3;
                    case 3:
                        if (!(!leadersMediaSeqRaw && attempts > 0)) return [3 /*break*/, 8];
                        if (!!leadersMediaSeqRaw) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.sessionLiveStateStore.isLeader(this.instanceId)];
                    case 4:
                        isLeader = _b.sent();
                        if (isLeader) {
                            debug("[".concat(this.instanceId, "]: I'm the new leader"));
                            return [2 /*return*/];
                        }
                        _b.label = 5;
                    case 5:
                        if (!this.allowedToSet) {
                            debug("[".concat(this.sessionId, "]: We are about to switch away from LIVE. Abort fetching from Store"));
                            return [3 /*break*/, 8];
                        }
                        segDur = this._getAnyFirstSegmentDurationMs() || DEFAULT_PLAYHEAD_INTERVAL_MS;
                        waitTimeMs = parseInt(segDur / 3, 10);
                        debug("[".concat(this.sessionId, "]: FOLLOWER: Leader has not put anything in store... Will check again in ").concat(waitTimeMs, "ms (Tries left=[").concat(attempts, "])"));
                        return [4 /*yield*/, timer(waitTimeMs)];
                    case 6:
                        _b.sent();
                        this.timerCompensation = false;
                        return [4 /*yield*/, this.sessionLiveState.get("lastRequestedMediaSeqRaw")];
                    case 7:
                        leadersMediaSeqRaw = _b.sent();
                        attempts--;
                        return [3 /*break*/, 3];
                    case 8:
                        if (!leadersMediaSeqRaw) {
                            debug("[".concat(this.instanceId, "]: The leader is still alive"));
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.sessionLiveState.get("liveSegsForFollowers")];
                    case 9:
                        liveSegsInStore = _b.sent();
                        attempts = 10;
                        _b.label = 10;
                    case 10:
                        if (!((leadersMediaSeqRaw <= this.lastRequestedMediaSeqRaw && attempts > 0) || (this._containsSegment(this.liveSegsForFollowers, liveSegsInStore) && attempts > 0))) return [3 /*break*/, 16];
                        if (!this.allowedToSet) {
                            debug("[".concat(this.sessionId, "]: We are about to switch away from LIVE. Abort fetching from Store"));
                            return [3 /*break*/, 16];
                        }
                        if (!(leadersMediaSeqRaw <= this.lastRequestedMediaSeqRaw)) return [3 /*break*/, 12];
                        return [4 /*yield*/, this.sessionLiveStateStore.isLeader(this.instanceId)];
                    case 11:
                        isLeader = _b.sent();
                        if (isLeader) {
                            debug("[".concat(this.instanceId, "][").concat(this.sessionId, "]: I'm the new leader"));
                            return [2 /*return*/];
                        }
                        _b.label = 12;
                    case 12:
                        if (this._containsSegment(this.liveSegsForFollowers, liveSegsInStore)) {
                            debug("[".concat(this.sessionId, "]: FOLLOWER: _containsSegment=true,").concat(leadersMediaSeqRaw, ",").concat(this.lastRequestedMediaSeqRaw));
                        }
                        segDur = this._getAnyFirstSegmentDurationMs() || DEFAULT_PLAYHEAD_INTERVAL_MS;
                        waitTimeMs = parseInt(segDur / 3, 10);
                        debug("[".concat(this.sessionId, "]: FOLLOWER: Cannot find anything NEW in store... Will check again in ").concat(waitTimeMs, "ms (Tries left=[").concat(attempts, "])"));
                        return [4 /*yield*/, timer(waitTimeMs)];
                    case 13:
                        _b.sent();
                        this.timerCompensation = false;
                        return [4 /*yield*/, this.sessionLiveState.get("lastRequestedMediaSeqRaw")];
                    case 14:
                        leadersMediaSeqRaw = _b.sent();
                        return [4 /*yield*/, this.sessionLiveState.get("liveSegsForFollowers")];
                    case 15:
                        liveSegsInStore = _b.sent();
                        attempts--;
                        return [3 /*break*/, 10];
                    case 16:
                        // FINALLY
                        if (leadersMediaSeqRaw <= this.lastRequestedMediaSeqRaw) {
                            debug("[".concat(this.instanceId, "][").concat(this.sessionId, "]: The leader is still alive"));
                            return [2 /*return*/];
                        }
                        // Follower updates its manifest building blocks (segment holders & counts)
                        this.lastRequestedMediaSeqRaw = leadersMediaSeqRaw;
                        this.liveSegsForFollowers = liveSegsInStore;
                        debug("[".concat(this.sessionId, "]: These are the segments from store: [").concat(JSON.stringify(this.liveSegsForFollowers), "]"));
                        this._updateLiveSegQueue();
                        return [2 /*return*/];
                    case 17:
                        FETCH_ATTEMPTS = 10;
                        this.liveSegsForFollowers = {};
                        bandwidthsToSkipOnRetry = [];
                        _loop_1 = function () {
                            var livePromises, manifestList, i, bw, err_3, allStoredMediaSeqCounts, higestMediaSeqCount_1, retryDelayMs, firstBw, lastIdx, leadersFirstSeqCounts, tries, transitSegs, transitSegs;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        if (isLeader) {
                                            debug("[".concat(this_1.sessionId, "]: LEADER: Trying to fetch manifests for all bandwidths\n Attempts left=[").concat(FETCH_ATTEMPTS, "]"));
                                        }
                                        else {
                                            debug("[".concat(this_1.sessionId, "]: NEW FOLLOWER: Trying to fetch manifests for all bandwidths\n Attempts left=[").concat(FETCH_ATTEMPTS, "]"));
                                        }
                                        if (!this_1.allowedToSet) {
                                            debug("[".concat(this_1.sessionId, "]: We are about to switch away from LIVE. Abort fetching from Live-Source"));
                                            return [2 /*return*/, "break"];
                                        }
                                        livePromises = [];
                                        manifestList = [];
                                        this_1.pushAmount = 0;
                                        _c.label = 1;
                                    case 1:
                                        _c.trys.push([1, 3, , 4]);
                                        if (bandwidthsToSkipOnRetry.length > 0) {
                                            debug("[".concat(this_1.sessionId, "]: (X) Skipping loadMedia promises for bws ").concat(JSON.stringify(bandwidthsToSkipOnRetry)));
                                        }
                                        // Collect Live Source Requesting Promises
                                        for (i = 0; i < Object.keys(this_1.mediaManifestURIs).length; i++) {
                                            bw = Object.keys(this_1.mediaManifestURIs)[i];
                                            if (bandwidthsToSkipOnRetry.includes(bw)) {
                                                continue;
                                            }
                                            livePromises.push(this_1._loadMediaManifest(bw));
                                            debug("[".concat(this_1.sessionId, "]: Pushed loadMedia promise for bw=[").concat(bw, "]"));
                                        }
                                        // Fetch From Live Source
                                        debug("[".concat(this_1.sessionId, "]: Executing Promises I: Fetch From Live Source"));
                                        return [4 /*yield*/, allSettled(livePromises)];
                                    case 2:
                                        manifestList = _c.sent();
                                        livePromises = [];
                                        return [3 /*break*/, 4];
                                    case 3:
                                        err_3 = _c.sent();
                                        debug("[".concat(this_1.sessionId, "]: Promises I: FAILURE!\n").concat(err_3));
                                        return [2 /*return*/, { value: void 0 }];
                                    case 4:
                                        if (!manifestList.some(function (result) { return result.status === "rejected"; })) return [3 /*break*/, 6];
                                        FETCH_ATTEMPTS--;
                                        debug("[".concat(this_1.sessionId, "]: ALERT! Promises I: Failed, Rejection Found! Trying again in 1000ms..."));
                                        return [4 /*yield*/, timer(1000)];
                                    case 5:
                                        _c.sent();
                                        return [2 /*return*/, "continue"];
                                    case 6:
                                        // Store the results locally
                                        manifestList.forEach(function (variantItem) {
                                            var bw = variantItem.value.bandwidth;
                                            if (!_this.liveSourceM3Us[bw]) {
                                                _this.liveSourceM3Us[bw] = {};
                                            }
                                            _this.liveSourceM3Us[bw] = variantItem.value;
                                        });
                                        allStoredMediaSeqCounts = Object.keys(this_1.liveSourceM3Us).map(function (variant) { return _this.liveSourceM3Us[variant].mediaSeq; });
                                        if (!!allStoredMediaSeqCounts.every(function (val, i, arr) { return val === arr[0]; })) return [3 /*break*/, 8];
                                        debug("[".concat(this_1.sessionId, "]: Live Mseq counts=[").concat(allStoredMediaSeqCounts, "]"));
                                        higestMediaSeqCount_1 = Math.max.apply(Math, allStoredMediaSeqCounts);
                                        bandwidthsToSkipOnRetry = Object.keys(this_1.liveSourceM3Us).filter(function (bw) {
                                            if (_this.liveSourceM3Us[bw].mediaSeq === higestMediaSeqCount_1) {
                                                return true;
                                            }
                                            return false;
                                        });
                                        // Decrement fetch counter
                                        FETCH_ATTEMPTS--;
                                        retryDelayMs = 1000;
                                        if (Object.keys(this_1.liveSegQueue).length > 0) {
                                            firstBw = Object.keys(this_1.liveSegQueue)[0];
                                            lastIdx = this_1.liveSegQueue[firstBw].length - 1;
                                            if (this_1.liveSegQueue[firstBw][lastIdx].duration) {
                                                retryDelayMs = this_1.liveSegQueue[firstBw][lastIdx].duration * 1000 * 0.25;
                                            }
                                        }
                                        // Wait a little before trying again
                                        debug("[".concat(this_1.sessionId, "]: ALERT! Live Source Data NOT in sync! Will try again after ").concat(retryDelayMs, "ms"));
                                        return [4 /*yield*/, timer(retryDelayMs)];
                                    case 7:
                                        _c.sent();
                                        if (isLeader) {
                                            this_1.timerCompensation = false;
                                        }
                                        return [2 /*return*/, "continue"];
                                    case 8:
                                        currentMseqRaw = allStoredMediaSeqCounts[0];
                                        if (!!isLeader) return [3 /*break*/, 26];
                                        return [4 /*yield*/, this_1.sessionLiveState.get("firstCounts")];
                                    case 9:
                                        leadersFirstSeqCounts = _c.sent();
                                        tries = 20;
                                        _c.label = 10;
                                    case 10:
                                        if (!((!isLeader && !leadersFirstSeqCounts.liveSourceMseqCount && tries > 0) || leadersFirstSeqCounts.liveSourceMseqCount === 0)) return [3 /*break*/, 14];
                                        debug("[".concat(this_1.sessionId, "]: NEW FOLLOWER: Waiting for LEADER to add 'firstCounts' in store! Will look again after 1000ms (tries left=").concat(tries, ")"));
                                        return [4 /*yield*/, timer(1000)];
                                    case 11:
                                        _c.sent();
                                        return [4 /*yield*/, this_1.sessionLiveState.get("firstCounts")];
                                    case 12:
                                        leadersFirstSeqCounts = _c.sent();
                                        tries--;
                                        return [4 /*yield*/, this_1.sessionLiveStateStore.isLeader(this_1.instanceId)];
                                    case 13:
                                        // Might take over as Leader if Leader is not setting data due to being down.
                                        isLeader = _c.sent();
                                        if (isLeader) {
                                            debug("[".concat(this_1.sessionId, "][").concat(this_1.instanceId, "]: I'm the new leader, and now I am going to add 'firstCounts' in store"));
                                        }
                                        return [3 /*break*/, 10];
                                    case 14:
                                        if (!(tries === 0)) return [3 /*break*/, 18];
                                        return [4 /*yield*/, this_1.sessionLiveStateStore.isLeader(this_1.instanceId)];
                                    case 15:
                                        isLeader = _c.sent();
                                        if (!isLeader) return [3 /*break*/, 16];
                                        debug("[".concat(this_1.sessionId, "][").concat(this_1.instanceId, "]: I'm the new leader, and now I am going to add 'firstCounts' in store"));
                                        return [2 /*return*/, "break"];
                                    case 16:
                                        debug("[".concat(this_1.sessionId, "][").concat(this_1.instanceId, "]: The leader is still alive"));
                                        return [4 /*yield*/, this_1.sessionLiveState.get("firstCounts")];
                                    case 17:
                                        leadersFirstSeqCounts = _c.sent();
                                        if (!leadersFirstSeqCounts.liveSourceMseqCount) {
                                            debug("[".concat(this_1.sessionId, "][").concat(this_1.instanceId, "]: Could not find 'firstCounts' in store. Abort Executing Promises II & Returning to Playhead."));
                                            return [2 /*return*/, { value: void 0 }];
                                        }
                                        _c.label = 18;
                                    case 18:
                                        if (!isLeader) return [3 /*break*/, 20];
                                        debug("[".concat(this_1.sessionId, "]: NEW LEADER: Original Leader went missing, I am retrying live source fetch..."));
                                        return [4 /*yield*/, this_1.sessionLiveState.set("transitSegs", this_1.vodSegments)];
                                    case 19:
                                        _c.sent();
                                        debug("[".concat(this_1.sessionId, "]: NEW LEADER: I am adding 'transitSegs' to Store for future followers"));
                                        return [2 /*return*/, "continue"];
                                    case 20:
                                        // Respawners never do this, only starter followers.
                                        // Edge Case: FOLLOWER transitioned from session with different segments from LEADER
                                        if (leadersFirstSeqCounts.discSeqCount !== this_1.discSeqCount) {
                                            this_1.discSeqCount = leadersFirstSeqCounts.discSeqCount;
                                        }
                                        if (!(leadersFirstSeqCounts.mediaSeqCount !== this_1.mediaSeqCount)) return [3 /*break*/, 22];
                                        this_1.mediaSeqCount = leadersFirstSeqCounts.mediaSeqCount;
                                        debug("[".concat(this_1.sessionId, "]: FOLLOWER transistioned with wrong V2L segments, updating counts to [").concat(this_1.mediaSeqCount, "][").concat(this_1.discSeqCount, "], and reading 'transitSegs' from store"));
                                        return [4 /*yield*/, this_1.sessionLiveState.get("transitSegs")];
                                    case 21:
                                        transitSegs = _c.sent();
                                        if (!this_1._isEmpty(transitSegs)) {
                                            this_1.vodSegments = transitSegs;
                                        }
                                        _c.label = 22;
                                    case 22:
                                        // Prepare to load segments...
                                        debug("[".concat(this_1.instanceId, "][").concat(this_1.sessionId, "]: Newest mseq from LIVE=").concat(currentMseqRaw, " First mseq in store=").concat(leadersFirstSeqCounts.liveSourceMseqCount));
                                        if (!(currentMseqRaw === leadersFirstSeqCounts.liveSourceMseqCount)) return [3 /*break*/, 23];
                                        this_1.pushAmount = 1; // Follower from start
                                        return [3 /*break*/, 25];
                                    case 23:
                                        // TODO: To support and account for past discontinuity tags in the Live Source stream,
                                        // we will need to get the real 'current' discontinuity-sequence count from Leader somehow.
                                        // RESPAWNED NODES
                                        this_1.pushAmount = currentMseqRaw - leadersFirstSeqCounts.liveSourceMseqCount + 1;
                                        return [4 /*yield*/, this_1.sessionLiveState.get("transitSegs")];
                                    case 24:
                                        transitSegs = _c.sent();
                                        //debug(`[${this.sessionId}]: NEW FOLLOWER: I tried to get 'transitSegs'. This is what I found ${JSON.stringify(transitSegs)}`);
                                        if (!this_1._isEmpty(transitSegs)) {
                                            this_1.vodSegments = transitSegs;
                                        }
                                        _c.label = 25;
                                    case 25:
                                        debug("[".concat(this_1.sessionId, "]: ...pushAmount=").concat(this_1.pushAmount));
                                        return [3 /*break*/, 27];
                                    case 26:
                                        // LEADER calculates pushAmount differently...
                                        if (this_1.firstTime) {
                                            this_1.pushAmount = 1; // Leader from start
                                        }
                                        else {
                                            this_1.pushAmount = currentMseqRaw - this_1.lastRequestedMediaSeqRaw;
                                            debug("[".concat(this_1.sessionId, "]: ...calculating pushAmount=").concat(currentMseqRaw, "-").concat(this_1.lastRequestedMediaSeqRaw, "=").concat(this_1.pushAmount));
                                        }
                                        debug("[".concat(this_1.sessionId, "]: ...pushAmount=").concat(this_1.pushAmount));
                                        return [2 /*return*/, "break"];
                                    case 27: return [2 /*return*/, "break"];
                                }
                            });
                        };
                        this_1 = this;
                        _b.label = 18;
                    case 18:
                        if (!(FETCH_ATTEMPTS > 0)) return [3 /*break*/, 20];
                        return [5 /*yield**/, _loop_1()];
                    case 19:
                        state_1 = _b.sent();
                        if (typeof state_1 === "object")
                            return [2 /*return*/, state_1.value];
                        if (state_1 === "break")
                            return [3 /*break*/, 20];
                        return [3 /*break*/, 18];
                    case 20:
                        if (FETCH_ATTEMPTS === 0) {
                            debug("[".concat(this.sessionId, "]: Fetching from Live-Source did not work! Returning to Playhead Loop..."));
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.sessionLiveStateStore.isLeader(this.instanceId)];
                    case 21:
                        isLeader = _b.sent();
                        if (!!isLeader) return [3 /*break*/, 26];
                        return [4 /*yield*/, this.sessionLiveState.get("lastRequestedMediaSeqRaw")];
                    case 22:
                        leadersCurrentMseqRaw = _b.sent();
                        return [4 /*yield*/, this.sessionLiveState.get("firstCounts")];
                    case 23:
                        counts = _b.sent();
                        leadersFirstMseqRaw = counts.liveSourceMseqCount;
                        if (!(leadersCurrentMseqRaw !== null && leadersCurrentMseqRaw > currentMseqRaw)) return [3 /*break*/, 26];
                        if (!(leadersFirstMseqRaw !== null && leadersFirstMseqRaw === leadersCurrentMseqRaw)) return [3 /*break*/, 25];
                        // Follower updates it's manifest ingedients (segment holders & counts)
                        this.lastRequestedMediaSeqRaw = leadersCurrentMseqRaw;
                        _a = this;
                        return [4 /*yield*/, this.sessionLiveState.get("liveSegsForFollowers")];
                    case 24:
                        _a.liveSegsForFollowers = _b.sent();
                        debug("[".concat(this.sessionId, "]: NEW FOLLOWER: Leader is ahead or behind me! Clearing Queue and Getting latest segments from store."));
                        this._updateLiveSegQueue();
                        this.firstTime = false;
                        debug("[".concat(this.sessionId, "]: Got all needed segments from live-source (read from store).\nWe are now able to build Live Manifest: [").concat(this.mediaSeqCount, "]"));
                        return [2 /*return*/];
                    case 25:
                        if (leadersCurrentMseqRaw < this.lastRequestedMediaSeqRaw) {
                            // WE ARE A RESPAWN-NODE, and we are ahead of leader.
                            this.blockGenerateManifest = true;
                        }
                        _b.label = 26;
                    case 26:
                        if (!this.allowedToSet) return [3 /*break*/, 28];
                        pushPromises = [];
                        for (i = 0; i < Object.keys(this.mediaManifestURIs).length; i++) {
                            bw = Object.keys(this.mediaManifestURIs)[i];
                            // will add new segments to live seg queue
                            pushPromises.push(this._parseMediaManifest(this.liveSourceM3Us[bw].M3U, this.mediaManifestURIs[bw], bw, isLeader));
                            debug("[".concat(this.sessionId, "]: Pushed pushPromise for bw=").concat(bw));
                        }
                        // Segment Pushing
                        debug("[".concat(this.sessionId, "]: Executing Promises II: Segment Pushing"));
                        return [4 /*yield*/, allSettled(pushPromises)];
                    case 27:
                        _b.sent();
                        leaderORFollower = isLeader ? "LEADER" : "NEW FOLLOWER";
                        newTotalDuration = this._incrementAndShift(leaderORFollower);
                        if (newTotalDuration) {
                            debug("[".concat(this.sessionId, "]: New Adjusted Playlist Duration=").concat(newTotalDuration, "s"));
                        }
                        _b.label = 28;
                    case 28:
                        if (!isLeader) return [3 /*break*/, 35];
                        if (!this.allowedToSet) return [3 /*break*/, 31];
                        liveBws = Object.keys(this.liveSegsForFollowers);
                        segListSize = this.liveSegsForFollowers[liveBws[0]].length;
                        if (!(segListSize > 0)) return [3 /*break*/, 31];
                        debug("[".concat(this.sessionId, "]: LEADER: Adding data to store!"));
                        return [4 /*yield*/, this.sessionLiveState.set("lastRequestedMediaSeqRaw", this.lastRequestedMediaSeqRaw)];
                    case 29:
                        _b.sent();
                        return [4 /*yield*/, this.sessionLiveState.set("liveSegsForFollowers", this.liveSegsForFollowers)];
                    case 30:
                        _b.sent();
                        _b.label = 31;
                    case 31:
                        if (!(this.firstTime && this.allowedToSet)) return [3 /*break*/, 34];
                        // Buy some time for followers (NOT Respawned) to fetch their own L.S m3u8.
                        return [4 /*yield*/, timer(1000)];
                    case 32:
                        // Buy some time for followers (NOT Respawned) to fetch their own L.S m3u8.
                        _b.sent(); // maybe remove
                        firstCounts = {
                            liveSourceMseqCount: this.lastRequestedMediaSeqRaw,
                            mediaSeqCount: this.prevMediaSeqCount,
                            discSeqCount: this.prevDiscSeqCount,
                        };
                        debug("[".concat(this.sessionId, "]: LEADER: I am adding 'firstCounts'=").concat(JSON.stringify(firstCounts), " to Store for future followers"));
                        return [4 /*yield*/, this.sessionLiveState.set("firstCounts", firstCounts)];
                    case 33:
                        _b.sent();
                        _b.label = 34;
                    case 34:
                        debug("[".concat(this.sessionId, "]: LEADER: I am using segs from Mseq=").concat(this.lastRequestedMediaSeqRaw));
                        return [3 /*break*/, 36];
                    case 35:
                        debug("[".concat(this.sessionId, "]: NEW FOLLOWER: I am using segs from Mseq=").concat(this.lastRequestedMediaSeqRaw));
                        _b.label = 36;
                    case 36:
                        this.firstTime = false;
                        debug("[".concat(this.sessionId, "]: Got all needed segments from live-source (from all bandwidths).\nWe are now able to build Live Manifest: [").concat(this.mediaSeqCount, "]"));
                        return [2 /*return*/];
                }
            });
        });
    };
    SessionLive.prototype._shiftSegments = function (opt) {
        var _totalDur = 0;
        var _segments = {};
        var _name = "";
        var _removedSegments = 0;
        var _removedDiscontinuities = 0;
        if (opt && opt.totalDur) {
            _totalDur = opt.totalDur;
        }
        if (opt && opt.segments) {
            _segments = JSON.parse(JSON.stringify(opt.segments)); // clone it
        }
        if (opt && opt.name) {
            _name = opt.name || "NONE";
        }
        if (opt && opt.removedSegments) {
            _removedSegments = opt.removedSegments;
        }
        if (opt && opt.removedDiscontinuities) {
            _removedDiscontinuities = opt.removedDiscontinuities;
        }
        var bws = Object.keys(_segments);
        /* When Total Duration is past the Limit, start Shifting V2L|LIVE segments if found */
        while (_totalDur > TARGET_PLAYLIST_DURATION_SEC) {
            // Skip loop if there are no more segments to remove...
            if (_segments[bws[0]].length === 0) {
                return { totalDuration: _totalDur, removedSegments: _removedSegments, removedDiscontinuities: _removedDiscontinuities, shiftedSegments: _segments };
            }
            debug("[".concat(this.sessionId, "]: ").concat(_name, ": (").concat(_totalDur, ")s/(").concat(TARGET_PLAYLIST_DURATION_SEC, ")s - Playlist Duration is Over the Target. Shift needed!"));
            var timeToRemove = 0;
            var incrementDiscSeqCount = false;
            // Shift Segments for each variant...
            for (var i = 0; i < bws.length; i++) {
                var seg = _segments[bws[i]].shift();
                if (i === 0) {
                    debug("[".concat(this.sessionId, "]: ").concat(_name, ": (").concat(bws[i], ") Ejected from playlist->: ").concat(JSON.stringify(seg, null, 2)));
                }
                if (seg && seg.discontinuity) {
                    incrementDiscSeqCount = true;
                    if (_segments[bws[i]].length > 0) {
                        seg = _segments[bws[i]].shift();
                        if (i === 0) {
                            debug("[".concat(this.sessionId, "]: ").concat(_name, ": (").concat(bws[i], ") Ejected from playlist->: ").concat(JSON.stringify(seg, null, 2)));
                        }
                    }
                }
                if (seg && seg.duration) {
                    timeToRemove = seg.duration;
                }
            }
            if (timeToRemove) {
                _totalDur -= timeToRemove;
                // Increment number of removed segments...
                _removedSegments++;
            }
            if (incrementDiscSeqCount) {
                // Update Session Live Discontinuity Sequence Count
                _removedDiscontinuities++;
            }
        }
        return { totalDuration: _totalDur, removedSegments: _removedSegments, removedDiscontinuities: _removedDiscontinuities, shiftedSegments: _segments };
    };
    /**
     * Shifts V2L or LIVE items if total segment duration (V2L+LIVE) are over the target duration.
     * It will also update and increment SessionLive's MediaSeqCount and DiscSeqCount based
     * on what was shifted.
     * @param {string} instanceName Name of instance "LEADER" | "FOLLOWER"
     * @returns {number} The new total duration in seconds
     */
    SessionLive.prototype._incrementAndShift = function (instanceName) {
        if (!instanceName) {
            instanceName = "UNKNOWN";
        }
        var vodBws = Object.keys(this.vodSegments);
        var liveBws = Object.keys(this.liveSegQueue);
        var vodTotalDur = 0;
        var liveTotalDur = 0;
        var totalDur = 0;
        var removedSegments = 0;
        var removedDiscontinuities = 0;
        // Calculate Playlist Total Duration
        this.vodSegments[vodBws[0]].forEach(function (seg) {
            if (seg.duration) {
                vodTotalDur += seg.duration;
            }
        });
        this.liveSegQueue[liveBws[0]].forEach(function (seg) {
            if (seg.duration) {
                liveTotalDur += seg.duration;
            }
        });
        totalDur = vodTotalDur + liveTotalDur;
        debug("[".concat(this.sessionId, "]: ").concat(instanceName, ": L2L dur->: ").concat(liveTotalDur, "s | V2L dur->: ").concat(vodTotalDur, "s | Total dur->: ").concat(totalDur, "s"));
        /** --- SHIFT then INCREMENT --- **/
        // Shift V2L Segments
        var outputV2L = this._shiftSegments({
            name: instanceName,
            totalDur: totalDur,
            segments: this.vodSegments,
            removedSegments: removedSegments,
            removedDiscontinuities: removedDiscontinuities,
        });
        // Update V2L Segments
        this.vodSegments = outputV2L.shiftedSegments;
        // Update values
        totalDur = outputV2L.totalDuration;
        removedSegments = outputV2L.removedSegments;
        removedDiscontinuities = outputV2L.removedDiscontinuities;
        // Shift LIVE Segments
        var outputLIVE = this._shiftSegments({
            name: instanceName,
            totalDur: totalDur,
            segments: this.liveSegQueue,
            removedSegments: removedSegments,
            removedDiscontinuities: removedDiscontinuities,
        });
        // Update LIVE Segments
        this.liveSegQueue = outputLIVE.shiftedSegments;
        // Update values
        totalDur = outputLIVE.totalDuration;
        removedSegments = outputLIVE.removedSegments;
        removedDiscontinuities = outputLIVE.removedDiscontinuities;
        // Update Session Live Discontinuity Sequence Count...
        this.prevDiscSeqCount = this.discSeqCount;
        this.discSeqCount += removedDiscontinuities;
        // Update Session Live Media Sequence Count...
        this.prevMediaSeqCount = this.mediaSeqCount;
        this.mediaSeqCount += removedSegments;
        if (this.restAmount) {
            this.mediaSeqCount += this.restAmount;
            debug("[".concat(this.sessionId, "]: ").concat(instanceName, ": Added restAmount=[").concat(this.restAmount, "] to 'mediaSeqCount'"));
            this.restAmount = 0;
        }
        if (this.discSeqCount !== this.prevDiscSeqCount) {
            debug("[".concat(this.sessionId, "]: ").concat(instanceName, ": Incrementing Dseq Count from {").concat(this.prevDiscSeqCount, "} -> {").concat(this.discSeqCount, "}"));
        }
        debug("[".concat(this.sessionId, "]: ").concat(instanceName, ": Incrementing Mseq Count from [").concat(this.prevMediaSeqCount, "] -> [").concat(this.mediaSeqCount, "]"));
        debug("[".concat(this.sessionId, "]: ").concat(instanceName, ": Finished updating all Counts and Segment Queues!"));
        return totalDur;
    };
    SessionLive.prototype._loadMediaManifest = function (bw) {
        return __awaiter(this, void 0, void 0, function () {
            var liveTargetBandwidth, mediaManifestUri, parser, controller, timeout, response;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.sessionLiveState) {
                            throw new Error("SessionLive not ready");
                        }
                        liveTargetBandwidth = this._findNearestBw(bw, Object.keys(this.mediaManifestURIs));
                        debug("[".concat(this.sessionId, "]: Requesting bw=(").concat(bw, "), Nearest Bandwidth is: ").concat(liveTargetBandwidth));
                        mediaManifestUri = this.mediaManifestURIs[liveTargetBandwidth];
                        parser = m3u8.createStream();
                        controller = new AbortController();
                        timeout = setTimeout(function () {
                            debug("[".concat(_this.sessionId, "]: Request Timeout! Aborting Request to ").concat(mediaManifestUri));
                            controller.abort();
                        }, FAIL_TIMEOUT);
                        return [4 /*yield*/, fetch(mediaManifestUri, { signal: controller.signal })];
                    case 1:
                        response = _a.sent();
                        try {
                            response.body.pipe(parser);
                        }
                        catch (err) {
                            debug("[".concat(this.sessionId, "]: Error when piping response to parser! ").concat(JSON.stringify(err)));
                            return [2 /*return*/, Promise.reject(err)];
                        }
                        finally {
                            clearTimeout(timeout);
                        }
                        return [2 /*return*/, new Promise(function (resolve, reject) {
                                parser.on("m3u", function (m3u) {
                                    try {
                                        var resolveObj = {
                                            M3U: m3u,
                                            mediaSeq: m3u.get("mediaSequence"),
                                            bandwidth: liveTargetBandwidth,
                                        };
                                        resolve(resolveObj);
                                    }
                                    catch (exc) {
                                        debug("[".concat(_this.sessionId, "]: Error when parsing latest manifest"));
                                        reject(exc);
                                    }
                                });
                                parser.on("error", function (exc) {
                                    debug("Parser Error: ".concat(JSON.stringify(exc)));
                                    reject(exc);
                                });
                            })];
                }
            });
        });
    };
    SessionLive.prototype._parseMediaManifest = function (m3u, mediaManifestUri, liveTargetBandwidth, isLeader) {
        var _this = this;
        return new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
            var baseUrl, m, startIdx;
            return __generator(this, function (_a) {
                try {
                    if (!this.liveSegQueue[liveTargetBandwidth]) {
                        this.liveSegQueue[liveTargetBandwidth] = [];
                    }
                    if (!this.liveSegsForFollowers[liveTargetBandwidth]) {
                        this.liveSegsForFollowers[liveTargetBandwidth] = [];
                    }
                    baseUrl = "";
                    m = mediaManifestUri.match(/^(.*)\/.*?$/);
                    if (m) {
                        baseUrl = m[1] + "/";
                    }
                    //debug(`[${this.sessionId}]: Current RAW Mseq:  [${m3u.get("mediaSequence")}]`);
                    //debug(`[${this.sessionId}]: Previous RAW Mseq: [${this.lastRequestedMediaSeqRaw}]`);
                    if (this.pushAmount >= 0) {
                        this.lastRequestedMediaSeqRaw = m3u.get("mediaSequence");
                    }
                    this.targetDuration = m3u.get("targetDuration");
                    startIdx = m3u.items.PlaylistItem.length - this.pushAmount;
                    if (startIdx < 0) {
                        this.restAmount = startIdx * -1;
                        startIdx = 0;
                    }
                    if (mediaManifestUri) {
                        // push segments
                        this._addLiveSegmentsToQueue(startIdx, m3u.items.PlaylistItem, baseUrl, liveTargetBandwidth, isLeader);
                    }
                    resolve();
                }
                catch (exc) {
                    console.error("ERROR: " + exc);
                    reject(exc);
                }
                return [2 /*return*/];
            });
        }); });
    };
    /**
     * Collects 'new' PlaylistItems and converts them into custom SegmentItems,
     * then Pushes them to the LiveSegQueue for all variants.
     * @param {number} startIdx
     * @param {m3u8.Item.PlaylistItem} playlistItems
     * @param {string} baseUrl
     * @param {string} liveTargetBandwidth
     */
    SessionLive.prototype._addLiveSegmentsToQueue = function (startIdx, playlistItems, baseUrl, liveTargetBandwidth, isLeader) {
        var leaderOrFollower = isLeader ? "LEADER" : "NEW FOLLOWER";
        var _loop_2 = function (i) {
            var seg = {};
            var playlistItem = playlistItems[i];
            var segmentUri = void 0;
            var cueData = null;
            var daterangeData = null;
            var attributes = playlistItem["attributes"].attributes;
            if (playlistItem.properties.discontinuity) {
                this_2.liveSegQueue[liveTargetBandwidth].push({ discontinuity: true });
                this_2.liveSegsForFollowers[liveTargetBandwidth].push({ discontinuity: true });
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
                    segmentUri = url.resolve(baseUrl, playlistItem.properties.uri);
                }
                seg["duration"] = playlistItem.properties.duration;
                seg["uri"] = segmentUri;
                seg["cue"] = cueData;
                if (daterangeData) {
                    seg["daterange"] = daterangeData;
                }
                // Push new Live Segments! But do not push duplicates
                var liveSegURIs = this_2.liveSegQueue[liveTargetBandwidth].filter(function (seg) { return seg.uri; }).map(function (seg) { return seg.uri; });
                if (seg.uri && liveSegURIs.includes(seg.uri)) {
                    debug("[".concat(this_2.sessionId, "]: ").concat(leaderOrFollower, ": Found duplicate live segment. Skip push! (").concat(liveTargetBandwidth, ")"));
                }
                else {
                    this_2.liveSegQueue[liveTargetBandwidth].push(seg);
                    this_2.liveSegsForFollowers[liveTargetBandwidth].push(seg);
                    debug("[".concat(this_2.sessionId, "]: ").concat(leaderOrFollower, ": Pushed segment (").concat(seg.uri ? seg.uri : "Disc-tag", ") to 'liveSegQueue' (").concat(liveTargetBandwidth, ")"));
                }
            }
        };
        var this_2 = this;
        for (var i = startIdx; i < playlistItems.length; i++) {
            _loop_2(i);
        }
    };
    /*
    ----------------------
      GENERATE MANIFEST
    ----------------------
    * Should be called independently from _loadAll...,_loadMedia...
    * So long Nodes are in sync!
    *
    * (returning null will cause the engine to try again after 1000ms)
    */
    SessionLive.prototype._GenerateLiveManifest = function (bw) {
        return __awaiter(this, void 0, void 0, function () {
            var liveTargetBandwidth, vodTargetBandwidth, segAmounts, i, vodSeg, m3u8;
            var _this = this;
            return __generator(this, function (_a) {
                if (bw === null) {
                    throw new Error("No bandwidth provided");
                }
                liveTargetBandwidth = this._findNearestBw(bw, Object.keys(this.mediaManifestURIs));
                vodTargetBandwidth = this._getNearestBandwidth(bw, Object.keys(this.vodSegments));
                debug("[".concat(this.sessionId, "]: Client requesting manifest for bw=(").concat(bw, "). Nearest LiveBw=(").concat(liveTargetBandwidth, ")"));
                if (this.blockGenerateManifest) {
                    debug("[".concat(this.sessionId, "]: FOLLOWER: Cannot Generate Manifest! Waiting to sync-up with Leader..."));
                    return [2 /*return*/, null];
                }
                // Uncomment below to guarantee that node always return the most current m3u8,
                // But it will cost an extra trip to store for every client request...
                /*
                //  DO NOT GENERATE MANIFEST CASE: Node is NOT in sync with Leader. (Store has new segs, but node hasn't read them yet)
                const isLeader = await this.sessionLiveStateStore.isLeader(this.instanceId);
                if (!isLeader) {
                  let leadersMediaSeqRaw = await this.sessionLiveState.get("lastRequestedMediaSeqRaw");
                  if (leadersMediaSeqRaw !== this.lastRequestedMediaSeqRaw) {
                    debug(`[${this.sessionId}]: FOLLOWER: Cannot Generate Manifest! <${this.instanceId}> New segments need to be collected first!...`);
                    return null;
                  }
                }
                */
                //  DO NOT GENERATE MANIFEST CASE: Node has not found anything in store OR Node has not even check yet.
                if (Object.keys(this.liveSegQueue).length === 0 || (this.liveSegQueue[liveTargetBandwidth] && this.liveSegQueue[liveTargetBandwidth].length === 0)) {
                    debug("[".concat(this.sessionId, "]: Cannot Generate Manifest! <").concat(this.instanceId, "> Not yet collected ANY segments from Live Source..."));
                    return [2 /*return*/, null];
                }
                //  DO NOT GENERATE MANIFEST CASE: Node is in the middle of gathering segs of all variants.
                if (Object.keys(this.liveSegQueue).length !== 0) {
                    segAmounts = Object.keys(this.liveSegQueue).map(function (bw) { return _this.liveSegQueue[bw].length; });
                    if (!segAmounts.every(function (val, i, arr) { return val === arr[0]; })) {
                        debug("[".concat(this.sessionId, "]: Cannot Generate Manifest! <").concat(this.instanceId, "> Not yet collected ALL segments from Live Source..."));
                        return [2 /*return*/, null];
                    }
                }
                if (!this._isEmpty(this.liveSegQueue) && this.liveSegQueue[Object.keys(this.liveSegQueue)[0]].length !== 0) {
                    this.targetDuration = this._getMaxDuration(this.liveSegQueue[Object.keys(this.liveSegQueue)[0]]);
                }
                // Determine if VOD segments influence targetDuration
                for (i = 0; i < this.vodSegments[vodTargetBandwidth].length; i++) {
                    vodSeg = this.vodSegments[vodTargetBandwidth][i];
                    // Get max duration amongst segments
                    if (vodSeg.duration > this.targetDuration) {
                        this.targetDuration = vodSeg.duration;
                    }
                }
                debug("[".concat(this.sessionId, "]: Started Generating the Manifest File:[").concat(this.mediaSeqCount, "]..."));
                m3u8 = "#EXTM3U\n";
                m3u8 += "#EXT-X-VERSION:6\n";
                m3u8 += m3u8Header(this.instanceId);
                m3u8 += "#EXT-X-INDEPENDENT-SEGMENTS\n";
                m3u8 += "#EXT-X-TARGETDURATION:" + Math.round(this.targetDuration) + "\n";
                m3u8 += "#EXT-X-MEDIA-SEQUENCE:" + this.mediaSeqCount + "\n";
                m3u8 += "#EXT-X-DISCONTINUITY-SEQUENCE:" + this.discSeqCount + "\n";
                if (Object.keys(this.vodSegments).length !== 0) {
                    // Add transitional segments if there are any left.
                    debug("[".concat(this.sessionId, "]: Adding a Total of (").concat(this.vodSegments[vodTargetBandwidth].length, ") VOD segments to manifest"));
                    m3u8 = this._setMediaManifestTags(this.vodSegments, m3u8, vodTargetBandwidth);
                    // Add live-source segments
                    m3u8 = this._setMediaManifestTags(this.liveSegQueue, m3u8, liveTargetBandwidth);
                }
                debug("[".concat(this.sessionId, "]: Manifest Generation Complete!"));
                return [2 /*return*/, m3u8];
            });
        });
    };
    SessionLive.prototype._setMediaManifestTags = function (segments, m3u8, bw) {
        var _loop_3 = function (i) {
            var seg = segments[bw][i];
            if (seg.discontinuity) {
                m3u8 += "#EXT-X-DISCONTINUITY\n";
            }
            if (seg.cue) {
                if (seg.cue.out) {
                    if (seg.cue.scteData) {
                        m3u8 += "#EXT-OATCLS-SCTE35:" + seg.cue.scteData + "\n";
                    }
                    if (seg.cue.assetData) {
                        m3u8 += "#EXT-X-ASSET:" + seg.cue.assetData + "\n";
                    }
                    m3u8 += "#EXT-X-CUE-OUT:DURATION=" + seg.cue.duration + "\n";
                }
                if (seg.cue.cont) {
                    if (seg.cue.scteData) {
                        m3u8 += "#EXT-X-CUE-OUT-CONT:ElapsedTime=" + seg.cue.cont + ",Duration=" + seg.cue.duration + ",SCTE35=" + seg.cue.scteData + "\n";
                    }
                    else {
                        m3u8 += "#EXT-X-CUE-OUT-CONT:" + seg.cue.cont + "/" + seg.cue.duration + "\n";
                    }
                }
            }
            if (seg.datetime) {
                m3u8 += "#EXT-X-PROGRAM-DATE-TIME:".concat(seg.datetime, "\n");
            }
            if (seg.daterange) {
                var dateRangeAttributes = Object.keys(seg.daterange)
                    .map(function (key) { return daterangeAttribute(key, seg.daterange[key]); })
                    .join(",");
                if (!seg.datetime && seg.daterange["start-date"]) {
                    m3u8 += "#EXT-X-PROGRAM-DATE-TIME:" + seg.daterange["start-date"] + "\n";
                }
                m3u8 += "#EXT-X-DATERANGE:" + dateRangeAttributes + "\n";
            }
            // Mimick logic used in hls-vodtolive
            if (seg.cue && seg.cue.in) {
                m3u8 += "#EXT-X-CUE-IN" + "\n";
            }
            if (seg.uri) {
                m3u8 += "#EXTINF:" + seg.duration.toFixed(3) + ",\n";
                m3u8 += seg.uri + "\n";
            }
        };
        for (var i = 0; i < segments[bw].length; i++) {
            _loop_3(i);
        }
        return m3u8;
    };
    SessionLive.prototype._findNearestBw = function (bw, array) {
        var sorted = array.sort(function (a, b) { return b - a; });
        return sorted.reduce(function (a, b) {
            return Math.abs(b - bw) < Math.abs(a - bw) ? b : a;
        });
    };
    SessionLive.prototype._getNearestBandwidth = function (bandwidthToMatch, array) {
        var sortedBandwidths = array.sort(function (a, b) { return a - b; });
        var exactMatch = sortedBandwidths.find(function (a) { return a == bandwidthToMatch; });
        if (exactMatch) {
            return exactMatch;
        }
        for (var i = 0; i < sortedBandwidths.length; i++) {
            if (Number(bandwidthToMatch) <= Number(sortedBandwidths[i])) {
                return sortedBandwidths[i];
            }
        }
        return sortedBandwidths[sortedBandwidths.length - 1];
    };
    SessionLive.prototype._getFirstBwWithSegmentsInList = function (allSegments) {
        var bandwidths = Object.keys(allSegments);
        for (var i = 0; i < bandwidths.length; i++) {
            var bw = bandwidths[i];
            if (allSegments[bw].length > 0) {
                return bw;
            }
        }
        debug("[".concat(this.sessionId, "]: ERROR Could not find any bandwidth with segments"));
        return null;
    };
    SessionLive.prototype._getMaxDuration = function (segments) {
        if (!segments) {
            debug("[".concat(this.sessionId, "]: ERROR segments is: ").concat(segments));
        }
        var max = 0;
        for (var i = 0; i < segments.length; i++) {
            var seg = segments[i];
            if (!seg.discontinuity) {
                if (seg.duration > max) {
                    max = seg.duration;
                }
            }
        }
        return max;
    };
    // To only use profiles that the channel will actually need.
    SessionLive.prototype._filterLiveProfiles = function () {
        var _this = this;
        var profiles = this.sessionLiveProfile;
        var toKeep = new Set();
        var newItem = {};
        profiles.forEach(function (profile) {
            var bwToKeep = _this._getNearestBandwidth(profile.bw, Object.keys(_this.mediaManifestURIs));
            toKeep.add(bwToKeep);
        });
        toKeep.forEach(function (bw) {
            newItem[bw] = _this.mediaManifestURIs[bw];
        });
        this.mediaManifestURIs = newItem;
    };
    SessionLive.prototype._getAnyFirstSegmentDurationMs = function () {
        if (this._isEmpty(this.liveSegQueue)) {
            return null;
        }
        var bw0 = Object.keys(this.liveSegQueue)[0];
        if (this.liveSegQueue[bw0].length === 0) {
            return null;
        }
        for (var i = 0; i < this.liveSegQueue[bw0].length; i++) {
            var segment = this.liveSegQueue[bw0][i];
            if (!segment.duration) {
                continue;
            }
            return segment.duration * 1000;
        }
        return null;
    };
    SessionLive.prototype._isEmpty = function (obj) {
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
    SessionLive.prototype._containsSegment = function (segments, newSegments) {
        if (!segments || !newSegments) {
            return false;
        }
        if (Object.keys(segments).length === 0 || Object.keys(newSegments).length === 0) {
            return false;
        }
        var someBw = Object.keys(segments)[0];
        var segList = segments[someBw];
        var mostRecentSegment = segList[segList.length - 1];
        var segListNew = newSegments[someBw];
        var mostRecentSegmentNew = segListNew[segListNew.length - 1];
        if (mostRecentSegmentNew.uri === mostRecentSegment.uri) {
            return true;
        }
        return false;
    };
    return SessionLive;
}());
module.exports = SessionLive;
