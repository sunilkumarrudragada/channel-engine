var EventStream = /** @class */ (function () {
    function EventStream(session) {
        this._session = session;
    }
    EventStream.prototype.poll = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var event = {};
            event = _this._session.consumeEvent();
            if (event) {
                resolve(JSON.stringify(event));
            }
            else {
                resolve(JSON.stringify({}));
            }
        });
    };
    return EventStream;
}());
module.exports = EventStream;
