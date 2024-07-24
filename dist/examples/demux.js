"use strict";
/*
 * Reference implementation of Channel Engine library using demuxed VOD assets.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var index_1 = require("../index");
var RefAssetManager = /** @class */ (function () {
    function RefAssetManager(opts) {
        this.assets = {
            1: [
                {
                    id: 1,
                    title: "Elephants dream",
                    uri: "https://playertest.longtailvideo.com/adaptive/elephants_dream_v4/index.m3u8",
                },
                {
                    id: 2,
                    title: "Test HLS Bird noises (1m10s)",
                    uri: "https://mtoczko.github.io/hls-test-streams/test-audio-pdt/playlist.m3u8",
                },
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
        return new Promise(function (resolve, reject) {
            var channelId = vodRequest.playlistId;
            if (_this.assets[channelId]) {
                var vod = _this.assets[channelId][_this.pos[channelId]++];
                if (_this.pos[channelId] > _this.assets[channelId].length - 1) {
                    _this.pos[channelId] = 0;
                }
                resolve(vod);
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
        return [{ id: "1", profile: this._getProfile(), audioTracks: this._getAudioTracks(), subtitleTracks: this._getSubtitleTracks() }];
    };
    RefChannelManager.prototype._getProfile = function () {
        return [
            {
                bw: 7934000,
                codecs: "avc1.4d001f,mp4a.40.2",
                resolution: [2880, 1440],
            },
            {
                bw: 7514000,
                codecs: "avc1.4d001f,mp4a.40.2",
                resolution: [1920, 1080],
            },
            { bw: 7134000, codecs: "avc1.4d001f,mp4a.40.2", resolution: [1280, 720] },
            { bw: 6134000, codecs: "avc1.4d001f,mp4a.40.2", resolution: [1024, 458] },
            { bw: 2323000, codecs: "avc1.4d001f,mp4a.40.2", resolution: [640, 286] },
            { bw: 495894, codecs: "avc1.4d001f,mp4a.40.2", resolution: [480, 214] },
        ];
    };
    RefChannelManager.prototype._getAudioTracks = function () {
        return [
            { language: "en", name: "English", default: true },
            { language: "sp", name: "Spanish", default: false },
        ];
    };
    RefChannelManager.prototype._getSubtitleTracks = function () {
        return [
            { language: "zh", name: "chinese", default: true },
            { language: "fr", name: "french", default: false }
        ];
    };
    return RefChannelManager;
}());
var refAssetManager = new RefAssetManager();
var refChannelManager = new RefChannelManager();
var engineOptions = {
    heartbeat: "/",
    averageSegmentDuration: 2000,
    channelManager: refChannelManager,
    defaultSlateUri: "https://mtoczko.github.io/hls-test-streams/test-audio-pdt/playlist.m3u8",
    slateRepetitions: 10,
    redisUrl: process.env.REDIS_URL,
    useDemuxedAudio: true,
    alwaysNewSegments: false,
    useVTTSubtitles: true,
    vttBasePath: '/subtitles'
};
var engine = new index_1.ChannelEngine(refAssetManager, engineOptions);
engine.start();
engine.listen(process.env.PORT || 8000);
