"use strict";
/*
 * Reference implementation of Channel Engine library using DRM (HLS+Widevine) VOD assets.
 *
 * Playback: https://shaka-player-demo.appspot.com/demo/#audiolang=sv-SE;textlang=sv-SE;uilang=sv-SE;asset=http://localhost:8000/channels/1/master.m3u8;license=https://cwip-shaka-proxy.appspot.com/no_auth;panel=CUSTOM%20CONTENT;build=uncompiled
 */
Object.defineProperty(exports, "__esModule", { value: true });
var index_1 = require("../index");
var RefAssetManager = /** @class */ (function () {
    function RefAssetManager(opts) {
        this.assets = {
            1: [
                {
                    id: 1,
                    title: "VINN DRM",
                    uri: "https://testcontent.eyevinn.technology/vinn/multidrm/index.m3u8"
                    // License server urL: https://widevine-dash.ezdrm.com/proxy?pX=1D331C
                },
                {
                    id: 2,
                    title: "VINN No DRM",
                    uri: "https://testcontent.eyevinn.technology/vinn/cmaf/index.m3u8"
                },
                {
                    id: 3,
                    title: "CE Promo DRM",
                    uri: "https://testcontent.eyevinn.technology/drm/CE-promo/index.m3u8"
                    // License server urL: https://widevine-dash.ezdrm.com/proxy?pX=1D331C
                },
                {
                    id: 4,
                    title: "Eyevinn Reel DRM",
                    uri: "https://testcontent.eyevinn.technology/drm/Eyevinn-Reel/index.m3u8"
                    // License server urL: https://widevine-dash.ezdrm.com/proxy?pX=1D331C
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
        return [{ id: "1", profile: this._getProfile(), audioTracks: this._getAudioTracks() }];
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
            { language: "en", name: "English" },
        ];
    };
    return RefChannelManager;
}());
var refAssetManager = new RefAssetManager();
var refChannelManager = new RefChannelManager();
var engineOptions = {
    heartbeat: "/",
    averageSegmentDuration: 4000,
    channelManager: refChannelManager,
    defaultSlateUri: "https://maitv-vod.lab.eyevinn.technology/slate-consuo.mp4/master.m3u8",
    slateRepetitions: 10,
    redisUrl: process.env.REDIS_URL,
    useDemuxedAudio: true,
    alwaysNewSegments: true,
};
var engine = new index_1.ChannelEngine(refAssetManager, engineOptions);
engine.start();
engine.listen(process.env.PORT || 8000);
