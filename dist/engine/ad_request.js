var MOCK_VAST = "<VAST version=\"4.0\" xmlns:xs=\"http://www.w3.org/2001/XMLSchema\" xmlns=\"http://www.iab.com/VAST\">  <Ad id=\"20001\" sequence=\"1\" conditionalAd=\"false\">    <InLine>      <AdSystem version=\"4.0\">iabtechlab</AdSystem>      <Error>http://example.com/error</Error>      <Impression id=\"Impression-ID\">http://example.com/track/impression</Impression>      <Pricing model=\"cpm\" currency=\"USD\">        <![CDATA[ 25.00 ]]>      </Pricing>      <AdTitle>Inline Simple Ad</AdTitle>      <AdVerifications></AdVerifications>      <Advertiser>IAB Sample Company</Advertiser>      <Category authority=\"http://www.iabtechlab.com/categoryauthority\">AD CONTENT description category</Category>      <Creatives>        <Creative id=\"5480\" sequence=\"1\" adId=\"2447226\">          <UniversalAdId idRegistry=\"Eyevinn-Ad-ID\" idValue=\"1\">1</UniversalAdId>          <Linear>            <TrackingEvents>              <Tracking event=\"start\" offset=\"09:15:23\">http://example.com/tracking/start</Tracking>              <Tracking event=\"firstQuartile\">http://example.com/tracking/firstQuartile</Tracking>              <Tracking event=\"midpoint\">http://example.com/tracking/midpoint</Tracking>              <Tracking event=\"thirdQuartile\">http://example.com/tracking/thirdQuartile</Tracking>              <Tracking event=\"complete\">http://example.com/tracking/complete</Tracking>            </TrackingEvents>            <Duration>00:00:45</Duration>            <MediaFiles/>            <VideoClicks>              <ClickThrough id=\"blog\">                <![CDATA[https://iabtechlab.com]]>              </ClickThrough>            </VideoClicks>          </Linear>        </Creative>      </Creatives>    </InLine>  </Ad></VAST>";
var MOCK_VMAP = "<vmap:VMAP xmlns:vmap=\"http://www.iab.net/vmap-1.0\" version=\"1.0\">   <vmap:AdBreak breakType=\"linear\" breakId=\"midroll1\" timeOffset=\"00:00:15.000\">     <vmap:AdSource allowMultipleAds=\"true\" followRedirects=\"true\" id=\"1\">       <vmap:VASTAdData>         <VAST version=\"3.0\" xsi:noNamespaceSchemaLocation=\"vast.xsd\">        ".concat(MOCK_VAST, "\n        </VAST>       </vmap:VASTAdData>     </vmap:AdSource>     <vmap:TrackingEvents>       <vmap:Tracking event=\"breakStart\">http://server.com/breakstart</vmap:Tracking>       <vmap:Tracking event=\"breakEnd\">http://server.com/breakend</vmap:Tracking>     </vmap:TrackingEvents>   </vmap:AdBreak>   <vmap:AdBreak breakType=\"linear\" breakId=\"midroll2\" timeOffset=\"00:10:00.000\">     <vmap:AdSource allowMultipleAds=\"true\" followRedirects=\"true\" id=\"2\">       <vmap:VASTAdData>         <VAST version=\"3.0\" xsi:noNamespaceSchemaLocation=\"vast.xsd\">        ").concat(MOCK_VAST, "\n        </VAST>       </vmap:VASTAdData>     </vmap:AdSource>     <vmap:TrackingEvents>       <vmap:Tracking event=\"breakStart\">http://server.com/breakstart</vmap:Tracking>       <vmap:Tracking event=\"breakEnd\">http://server.com/breakend</vmap:Tracking>     </vmap:TrackingEvents>   </vmap:AdBreak> </vmap:VMAP>");
var request = require('request');
var debug = require('debug')('engine-adrequest');
var DEFAULT_BREAK_PATTERN = [
    { position: 0.0 },
    { position: 10 * 60.0 }
];
var MOCK_ADS = [
    'video-sff-impression',
    'video-apotea-impression',
    //  'video-spp-impression',
];
var ADID_MAP = {
    'video-sff-impression': { adid: 4 },
    'video-apotea-impression': { adid: 5 },
    'video-spp-impression': { adid: 3 },
};
function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}
var AdRequest = /** @class */ (function () {
    function AdRequest(adCopyMgrUri, adXchangeUri) {
        this._adCopyMgrUri = adCopyMgrUri;
        this._adXchangeUri = adXchangeUri;
        this._splices = [];
    }
    AdRequest.prototype.resolve = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this._requestBreaks().then(function (breaks) {
                var adBreakPromises = [];
                for (var i = 0; i < breaks.length; i++) {
                    adBreakPromises.push(_this._fillBreak(breaks[i]));
                }
                Promise.all(adBreakPromises).then(function () {
                    resolve(_this.splices);
                }).catch(reject);
            }).catch(reject);
        });
    };
    Object.defineProperty(AdRequest.prototype, "splices", {
        get: function () {
            return this._splices.sort(function (a, b) { return a.position - b.position; });
        },
        enumerable: false,
        configurable: true
    });
    AdRequest.prototype._requestBreaks = function () {
        return new Promise(function (resolve, reject) {
            var breaks = DEFAULT_BREAK_PATTERN;
            resolve(breaks);
        });
    };
    AdRequest.prototype._requestAdsFromXchange = function () {
        return new Promise(function (resolve, reject) {
            var ads = MOCK_ADS;
            debug("Got ads from xchange:");
            debug(ads);
            resolve(ads);
        });
    };
    AdRequest.prototype._requestAds = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this._requestAdsFromXchange().then(function (ads) {
                var resolvedAds = [];
                var adPromises = [];
                for (var i = 0; i < ads.length; i++) {
                    var ad = ADID_MAP[ads[i]];
                    resolvedAds.push(ad);
                    adPromises.push(_this._getAdById(ad));
                }
                Promise.all(adPromises).then(function () {
                    debug("Got ads:");
                    debug(resolvedAds);
                    resolve(resolvedAds);
                })
                    .catch(reject);
            });
        });
    };
    AdRequest.prototype._fillBreak = function (adbreak) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this._requestAds().then(function (ads) {
                var p = 0.0;
                for (var i = 0; i < ads.length; i++) {
                    _this._splices.push({ adid: ads[i].adid, position: adbreak.position + p, segments: ads[i].segments });
                    p += ads[i].duration;
                }
                resolve();
            });
        });
    };
    AdRequest.prototype._getAdById = function (ad) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            request({ url: _this._adCopyMgrUri + '/ad/' + ad.adid }, function (err, resp, body) {
                if (resp.statusCode == 200) {
                    var data = JSON.parse(body);
                    ad.adid = data.id;
                    ad.uri = data.uri;
                    ad.segments = data.segments;
                    ad.duration = (1 * data.duration);
                    resolve();
                }
                else {
                    reject(err);
                }
            });
        });
    };
    return AdRequest;
}());
module.exports = AdRequest;
