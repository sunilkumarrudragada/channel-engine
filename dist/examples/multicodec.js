"use strict";
/*
 * Reference implementation of Channel Engine library
 */
Object.defineProperty(exports, "__esModule", { value: true });
var index_1 = require("../index");
var RefAssetManager = /** @class */ (function () {
    function RefAssetManager(opts) {
        this.assets = {
            1: [
                {
                    id: 1,
                    title: "Sollevante",
                    uri: "https://testcontent.eyevinn.technology/dolby/index.m3u8",
                }
            ],
        };
        this.pos = {
            1: 0,
        };
    }
    /**
     *
     * @param {Object} vodRequest
     *   {
     *      sessionId,
     *      category,
     *      playlistId
     *   }
     */
    RefAssetManager.prototype.getNextVod = function (vodRequest) {
        var _this = this;
        console.log(this.assets);
        return new Promise(function (resolve, reject) {
            var channelId = vodRequest.playlistId;
            if (_this.assets[channelId]) {
                var vod = _this.assets[channelId][_this.pos[channelId]++];
                if (_this.pos[channelId] > _this.assets[channelId].length - 1) {
                    _this.pos[channelId] = 0;
                }
                var vodResponse = {
                    id: vod.id,
                    title: vod.title,
                    uri: vod.uri,
                };
                resolve(vodResponse);
            }
            else {
                reject("Invalid channelId provided");
            }
        });
    };
    return RefAssetManager;
}());
var RefChannelManager = /** @class */ (function () {
    function RefChannelManager() {
    }
    RefChannelManager.prototype.getChannels = function () {
        //return [ { id: '1', profile: this._getProfile() }, { id: 'faulty', profile: this._getProfile() } ];
        return [{
                id: "1",
                profile: this._getProfile(),
                audioTracks: this._getAudioTracks(),
            }];
    };
    RefChannelManager.prototype._getProfile = function () {
        return [
            { resolution: [640, 360], bw: 3663471, codecs: "avc1.64001F,mp4a.40.2", channels: "2" },
            { resolution: [1280, 720], bw: 5841380, codecs: "avc1.64001F,mp4a.40.2", channels: "2" },
            { resolution: [1920, 1080], bw: 8973571, codecs: "avc1.64001F,mp4a.40.2", channels: "2" },
            { resolution: [640, 360], bw: 4301519, codecs: "avc1.64001F,ec-3", channels: "16/JOC" },
            { resolution: [1280, 720], bw: 6479428, codecs: "avc1.64001F,ec-3", channels: "16/JOC" },
            { resolution: [1920, 1080], bw: 9611619, codecs: "avc1.640032,ec-3", channels: "16/JOC" },
        ];
    };
    RefChannelManager.prototype._getAudioTracks = function () {
        return [
            { language: "ja", "name": "日本語", default: true },
            { language: "en", "name": "English", default: false }
        ];
    };
    return RefChannelManager;
}());
var refAssetManager = new RefAssetManager();
var refChannelManager = new RefChannelManager();
var engineOptions = {
    heartbeat: "/",
    useDemuxedAudio: true,
    averageSegmentDuration: 2000,
    channelManager: refChannelManager,
    slateRepetitions: 10,
    redisUrl: process.env.REDIS_URL,
};
var engine = new index_1.ChannelEngine(refAssetManager, engineOptions);
engine.start();
engine.listen(process.env.PORT || 8000);
