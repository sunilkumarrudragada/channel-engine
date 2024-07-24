"use strict";
/*
 * Reference implementation of Channel Engine library
 */
Object.defineProperty(exports, "__esModule", { value: true });
var index_1 = require("../index");
var DEFAULT_ASSETS = [
    {
        id: 1,
        title: "Tears of Steel",
        uri: "https://maitv-vod.lab.eyevinn.technology/tearsofsteel_4k.mov/master.m3u8",
    },
    {
        id: 2,
        title: "VINN",
        uri: "https://maitv-vod.lab.eyevinn.technology/VINN.mp4/master.m3u8",
    },
];
var RefAssetManager = /** @class */ (function () {
    function RefAssetManager(opts) {
        this.assets = {};
        this.assets['1'] = DEFAULT_ASSETS;
        this.pos = {
            '1': 0,
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
            if (_this.pos[channelId] === undefined) {
                _this.pos[channelId] = 0;
                _this.assets[channelId] = DEFAULT_ASSETS;
            }
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
        this.channels = [];
        this.channels.push({ id: "1", profile: this._getProfile() });
    }
    RefChannelManager.prototype.getChannels = function () {
        //return [ { id: '1', profile: this._getProfile() }, { id: 'faulty', profile: this._getProfile() } ];
        //return [{ id: "1", profile: this._getProfile() }];
        return this.channels;
    };
    RefChannelManager.prototype.autoCreateChannel = function (channelId) {
        if (!this.channels.find(function (ch) { return ch.id === channelId; })) {
            this.channels.push({ id: channelId, profile: this._getProfile() });
        }
    };
    RefChannelManager.prototype._getProfile = function () {
        return [
            { bw: 6134000, codecs: "avc1.4d001f,mp4a.40.2", resolution: [1024, 458] },
            { bw: 2323000, codecs: "avc1.4d001f,mp4a.40.2", resolution: [640, 286] },
            { bw: 1313000, codecs: "avc1.4d001f,mp4a.40.2", resolution: [480, 214] },
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
    autoCreateSession: true,
    defaultSlateUri: "https://maitv-vod.lab.eyevinn.technology/slate-consuo.mp4/master.m3u8",
    slateRepetitions: 10,
};
var engine = new index_1.ChannelEngine(refAssetManager, engineOptions);
engine.start();
engine.listen(process.env.PORT || 8000);
