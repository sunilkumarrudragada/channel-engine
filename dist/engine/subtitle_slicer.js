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
var fetch = require("node-fetch");
var fs = require("fs");
var SubtitleSlicer = /** @class */ (function () {
    function SubtitleSlicer() {
        this.vttFiles = {};
    }
    SubtitleSlicer.prototype.getVttFile = function (url) {
        return __awaiter(this, void 0, void 0, function () {
            var resp, text;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, fetch(url)];
                    case 1:
                        resp = _a.sent();
                        if (!(resp.status === 200)) return [3 /*break*/, 3];
                        return [4 /*yield*/, resp.text()];
                    case 2:
                        text = _a.sent();
                        return [2 /*return*/, text];
                    case 3: return [2 /*return*/, ""];
                }
            });
        });
    };
    SubtitleSlicer.prototype.checkTimeStamp = function (line, startTime, endTime, elapsedtime) {
        var times = line.split("-->");
        var startTimeTimestamp = times[0].split(":");
        var endTimeTimestamp = times[1].split(":");
        var startTimeTimestampInSec = parseInt(startTimeTimestamp[0]) * 3600;
        startTimeTimestampInSec += parseInt(startTimeTimestamp[1]) * 60;
        var startTimeSecondsAndFractions = startTimeTimestamp[2].split(".");
        startTimeTimestampInSec += parseInt(startTimeSecondsAndFractions[0]);
        var endTimeTimestampInSec = parseInt(endTimeTimestamp[0]) * 3600;
        endTimeTimestampInSec += parseInt(endTimeTimestamp[1]) * 60;
        var endTimeSecondsAndFractions = endTimeTimestamp[2].split(".");
        endTimeTimestampInSec += parseInt(endTimeSecondsAndFractions[0]);
        startTime = parseInt(startTime);
        endTime = parseInt(endTime);
        elapsedtime = parseInt(elapsedtime);
        startTime += elapsedtime;
        endTime += elapsedtime;
        if (startTime <= startTimeTimestampInSec && startTimeTimestampInSec < endTime) {
            return true;
        }
        if (startTime < endTimeTimestampInSec && endTimeTimestampInSec <= endTime) {
            return true;
        }
        if (startTimeTimestampInSec < startTime && endTime < endTimeTimestampInSec) {
            return true;
        }
        return false;
    };
    SubtitleSlicer.prototype.streamToString = function (stream) {
        var chunks = [];
        return new Promise(function (resolve, reject) {
            stream.on('data', function (chunk) { return chunks.push(Buffer.from(chunk)); });
            stream.on('error', function (err) { return reject(err); });
            stream.on('end', function () { return resolve(Buffer.concat(chunks).toString('utf8')); });
        });
    };
    SubtitleSlicer.prototype.generateVtt = function (params, _injectedVttFile, _injectedPreviousVttFile) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function () {
            var paramEncode, uri, startTime, endTime, elapsedTime, previousParams, previousUri, previousStartTime, previousEndTime, previousElapsedTime, file, previousFile, newFile, previousFileLines, previousFileContentToAdd, i, ss, shouldAdd, j, lines, addedOnce, i, ss, shouldAdd, j;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        paramEncode = new URLSearchParams(params);
                        uri = paramEncode.get("vtturi");
                        startTime = paramEncode.get("starttime");
                        endTime = paramEncode.get("endtime");
                        elapsedTime = paramEncode.get("elapsedtime");
                        previousParams = new URLSearchParams(paramEncode.get("previousvtturi"));
                        previousUri = previousParams.get("vtturi");
                        previousStartTime = previousParams.get("starttime");
                        previousEndTime = previousParams.get("endtime");
                        previousElapsedTime = previousParams.get("elapsedtime");
                        file = "";
                        previousFile = "";
                        newFile = "";
                        if (!uri) return [3 /*break*/, 3];
                        if (this.vttFiles.length) {
                            file = this.vttFile[uri];
                        }
                        if (!!file) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.getVttFile(uri)];
                    case 1:
                        file = _e.sent();
                        _e.label = 2;
                    case 2: return [3 /*break*/, 6];
                    case 3:
                        if (!_injectedVttFile) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.streamToString(_injectedVttFile)];
                    case 4:
                        file = _e.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        console.error("no vtt file provided");
                        _e.label = 6;
                    case 6:
                        if (!previousUri) return [3 /*break*/, 9];
                        if (this.vttFiles.length) {
                            previousFile = this.vttFile[previousUri];
                        }
                        if (!!previousFile) return [3 /*break*/, 8];
                        return [4 /*yield*/, this.getVttFile(previousUri)];
                    case 7:
                        previousFile = _e.sent();
                        _e.label = 8;
                    case 8: return [3 /*break*/, 11];
                    case 9:
                        if (!_injectedPreviousVttFile) return [3 /*break*/, 11];
                        return [4 /*yield*/, this.streamToString(_injectedPreviousVttFile)];
                    case 10:
                        previousFile = _e.sent();
                        _e.label = 11;
                    case 11:
                        previousFileLines = previousFile.split("\n");
                        previousFileContentToAdd = "";
                        for (i = 0; i < previousFileLines.length; i++) {
                            ss = previousFileLines[i];
                            if ((_a = ss.match(/(\d+):(\d+):(\d+).(\d+) --> (\d+):(\d+):(\d+).(\d+)/)) === null || _a === void 0 ? void 0 : _a.input) {
                                shouldAdd = this.checkTimeStamp(ss, previousStartTime, previousEndTime, previousElapsedTime);
                                if (shouldAdd) {
                                    if (previousFileLines[i - 1]) {
                                        if (previousFileLines[i - 1].slice(0, 4) !== "NOTE")
                                            previousFileContentToAdd += previousFileLines[i - 1] + "\n";
                                    }
                                    previousFileContentToAdd += ss + "\n";
                                    j = 1;
                                    while (previousFileLines.length > i + j) {
                                        if (previousFileLines[i + j]) {
                                            previousFileContentToAdd += previousFileLines[i + j] + "\n";
                                        }
                                        else {
                                            break;
                                        }
                                        j++;
                                    }
                                    previousFileContentToAdd += "\n";
                                }
                            }
                        }
                        lines = file.split("\n");
                        addedOnce = false;
                        for (i = 0; i < lines.length; i++) {
                            ss = lines[i];
                            switch (ss) {
                                case (_b = ss.match("WEBVTT")) === null || _b === void 0 ? void 0 : _b.input:
                                    newFile += ss + "\n";
                                    break;
                                case (_c = ss.match(/X-TIMESTAMP-MAP/)) === null || _c === void 0 ? void 0 : _c.input:
                                    if (!ss.match(/LOCAL:00:00:00.000/) || !ss.match(/MPEGTS:0/)) {
                                        console.warn("MPEGTS and/or LOCAL is not zero");
                                    }
                                    newFile += ss + "\n\n";
                                    break;
                                case (_d = ss.match(/(\d+):(\d+):(\d+).(\d+) --> (\d+):(\d+):(\d+).(\d+)/)) === null || _d === void 0 ? void 0 : _d.input:
                                    shouldAdd = this.checkTimeStamp(ss, startTime, endTime, elapsedTime);
                                    if (shouldAdd) {
                                        if (!addedOnce) {
                                            addedOnce = true;
                                            newFile += previousFileContentToAdd;
                                        }
                                        if (lines[i - 1]) {
                                            if (lines[i - 1].slice(0, 4) !== "NOTE")
                                                newFile += lines[i - 1] + "\n";
                                        }
                                        newFile += ss + "\n";
                                        j = 1;
                                        while (lines.length > i + j) {
                                            if (lines[i + j]) {
                                                newFile += lines[i + j] + "\n";
                                            }
                                            else {
                                                break;
                                            }
                                            j++;
                                        }
                                        newFile += "\n";
                                    }
                                    break;
                            }
                        }
                        return [2 /*return*/, newFile];
                }
            });
        });
    };
    return SubtitleSlicer;
}());
module.exports = SubtitleSlicer;
