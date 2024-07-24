"use strict";
/*
 * Reference implementation of Channel Engine library
 */
Object.defineProperty(exports, "__esModule", { value: true });
var index_1 = require("../index");
var uuidv4 = require('uuid').v4;
var STITCH_ENDPOINT = process.env.STITCH_ENDPOINT || "http://lambda.eyevinn.technology/stitch/master.m3u8";
var RefAssetManager = /** @class */ (function () {
    function RefAssetManager(opts) {
        if (process.env.TEST_CHANNELS) {
            this.assets = {};
            this.pos = {};
            var testChannelsCount = parseInt(process.env.TEST_CHANNELS, 10);
            for (var i = 0; i < testChannelsCount; i++) {
                var channelId = "".concat(i + 1);
                this.assets[channelId] = [
                    { id: 1, title: "Tears of Steel", uri: "https://maitv-vod.lab.eyevinn.technology/tearsofsteel_4k.mov/master.m3u8" },
                    { id: 2, title: "Unhinged Trailer", uri: "https://maitv-vod.lab.eyevinn.technology/UNHINGED_Trailer_2020.mp4/master.m3u8" },
                    { id: 3, title: "Morbius Trailer", uri: "https://maitv-vod.lab.eyevinn.technology/MORBIUS_Trailer_2020.mp4/master.m3u8" },
                    { id: 4, title: "TV Plus Joachim", uri: "https://maitv-vod.lab.eyevinn.technology/tvplus-ad-joachim.mov/master.m3u8" },
                    { id: 5, title: "The Outpost Trailer", uri: "https://maitv-vod.lab.eyevinn.technology/THE_OUTPOST_Trailer_2020.mp4/master.m3u8" },
                    { id: 6, title: "TV Plus Megha", uri: "https://maitv-vod.lab.eyevinn.technology/tvplus-ad-megha.mov/master.m3u8" },
                ];
                this.pos[channelId] = 2;
            }
        }
        else {
            this.assets = {
                '1': [
                    { id: 1, title: "Tears of Steel", uri: "https://maitv-vod.lab.eyevinn.technology/tearsofsteel_4k.mov/master.m3u8" },
                    { id: 2, title: "Morbius Trailer", uri: "https://maitv-vod.lab.eyevinn.technology/MORBIUS_Trailer_2020.mp4/master.m3u8" },
                    { id: 3, title: "The Outpost Trailer", uri: "https://maitv-vod.lab.eyevinn.technology/THE_OUTPOST_Trailer_2020.mp4/master.m3u8" },
                    { id: 4, title: "Unhinged Trailer", uri: "https://maitv-vod.lab.eyevinn.technology/UNHINGED_Trailer_2020.mp4/master.m3u8" },
                    { id: 5, title: "TV Plus Megha", uri: "https://maitv-vod.lab.eyevinn.technology/tvplus-ad-megha.mov/master.m3u8" },
                    { id: 6, title: "TV Plus Joachim", uri: "https://maitv-vod.lab.eyevinn.technology/tvplus-ad-joachim.mov/master.m3u8" },
                ]
            };
            this.pos = {
                '1': 1
            };
        }
    }
    /* @param {Object} vodRequest
     *   {
     *      sessionId,
     *      category,
     *      playlistId
     *   }
     */
    RefAssetManager.prototype.getNextVod = function (vodRequest) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var channelId = vodRequest.playlistId;
            if (_this.assets[channelId]) {
                var vod = _this.assets[channelId][_this.pos[channelId]++];
                if (_this.pos[channelId] > _this.assets[channelId].length - 1) {
                    _this.pos[channelId] = 0;
                }
                var payload = {
                    uri: vod.uri,
                    breaks: [
                        {
                            pos: 0,
                            duration: 15 * 1000,
                            url: "https://maitv-vod.lab.eyevinn.technology/ads/apotea-15s.mp4/master.m3u8"
                        }
                    ]
                };
                var buff = Buffer.from(JSON.stringify(payload));
                var encodedPayload = buff.toString("base64");
                var vodResponse = {
                    id: vod.id,
                    title: vod.title,
                    uri: STITCH_ENDPOINT + "?payload=" + encodedPayload
                };
                resolve(vodResponse);
            }
            else {
                reject("Invalid channelId provided");
            }
        });
    };
    RefAssetManager.prototype.handleError = function (err, vodResponse) {
        console.error(err.message);
    };
    return RefAssetManager;
}());
var RefChannelManager = /** @class */ (function () {
    function RefChannelManager(opts) {
        this.channels = [];
        if (process.env.TEST_CHANNELS) {
            var testChannelsCount = parseInt(process.env.TEST_CHANNELS, 10);
            for (var i = 0; i < testChannelsCount; i++) {
                this.channels.push({ id: "".concat(i + 1), profile: this._getProfile() });
            }
        }
        else {
            this.channels = [{ id: "1", profile: this._getProfile() }];
        }
    }
    RefChannelManager.prototype.getChannels = function () {
        return this.channels;
    };
    RefChannelManager.prototype._getProfile = function () {
        return [
            { bw: 8242000, codecs: 'avc1.4d001f,mp4a.40.2', resolution: [1024, 458] },
            { bw: 1274000, codecs: 'avc1.4d001f,mp4a.40.2', resolution: [640, 286] },
            { bw: 742000, codecs: 'avc1.4d001f,mp4a.40.2', resolution: [480, 214] },
        ];
    };
    return RefChannelManager;
}());
var StreamType = Object.freeze({
    LIVE: 1,
    VOD: 2,
});
var StreamSwitchManager = /** @class */ (function () {
    function StreamSwitchManager() {
        this.schedule = {};
        if (process.env.TEST_CHANNELS) {
            var testChannelsCount = parseInt(process.env.TEST_CHANNELS, 10);
            for (var i = 0; i < testChannelsCount; i++) {
                var channelId = "".concat(i + 1);
                this.schedule[channelId] = [];
            }
        }
        else {
            this.schedule = {
                '1': []
            };
        }
    }
    StreamSwitchManager.prototype.generateID = function () {
        return uuidv4();
    };
    StreamSwitchManager.prototype.getPrerollUri = function (channelId) {
        var defaultPrerollSlateUri = "https://maitv-vod.lab.eyevinn.technology/slate-consuo.mp4/master.m3u8";
        return new Promise(function (resolve, reject) { resolve(defaultPrerollSlateUri); });
    };
    StreamSwitchManager.prototype.getSchedule = function (channelId) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (_this.schedule[channelId]) {
                var tsNow_1 = Date.now();
                var streamDuration = 60 * 1000;
                var startOffset = tsNow_1 + streamDuration;
                var endTime = startOffset + streamDuration;
                // Break in with live and scheduled VOD content after 60 seconds of VOD2Live the first time Channel Engine starts
                // Required: "assetId", "start_time", "end_time", "uri", "duration"
                // "duration" is only required for StreamType.VOD
                _this.schedule[channelId] = _this.schedule[channelId].filter(function (obj) { return obj.end_time >= tsNow_1; });
                if (_this.schedule[channelId].length === 0) {
                    _this.schedule[channelId].push({
                        eventId: _this.generateID(),
                        assetId: _this.generateID(),
                        title: "Live stream test",
                        type: StreamType.LIVE,
                        start_time: startOffset,
                        end_time: endTime,
                        uri: "https://d2fz24s2fts31b.cloudfront.net/out/v1/6484d7c664924b77893f9b4f63080e5d/manifest.m3u8",
                    }, {
                        eventId: _this.generateID(),
                        assetId: _this.generateID(),
                        title: "Scheduled VOD test",
                        type: StreamType.VOD,
                        start_time: (endTime + 100 * 1000),
                        end_time: (endTime + 100 * 1000) + streamDuration,
                        uri: "https://maitv-vod.lab.eyevinn.technology/COME_TO_DADDY_Trailer_2020.mp4/master.m3u8",
                        duration: streamDuration,
                    });
                }
                resolve(_this.schedule[channelId]);
            }
            else {
                reject("Invalid channelId provided");
            }
        });
    };
    return StreamSwitchManager;
}());
var refAssetManager = new RefAssetManager();
var refChannelManager = new RefChannelManager();
var refStreamSwitchManager = new StreamSwitchManager();
var engineOptions = {
    heartbeat: "/",
    averageSegmentDuration: 2000,
    channelManager: refChannelManager,
    streamSwitchManager: refStreamSwitchManager,
    defaultSlateUri: "https://maitv-vod.lab.eyevinn.technology/slate-consuo.mp4/master.m3u8",
    slateRepetitions: 10,
    redisUrl: process.env.REDIS_URL,
};
var engine = new index_1.ChannelEngine(refAssetManager, engineOptions);
engine.start();
engine.listen(process.env.PORT || 8000);
