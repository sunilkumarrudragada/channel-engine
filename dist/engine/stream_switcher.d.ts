export = StreamSwitcher;
declare class StreamSwitcher {
    constructor(config: any);
    sessionId: any;
    useDemuxedAudio: boolean;
    cloudWatchLogging: boolean;
    streamTypeLive: boolean;
    streamSwitchManager: any;
    eventId: any;
    working: boolean;
    timeDiff: any;
    abortTimeStamp: number;
    prerollsCache: {};
    getEventId(): any;
    abortLiveFeed(session: any, sessionLive: any, message: any): Promise<boolean>;
    /**
     *
     * @param {Session} session The VOD2Live Session object.
     * @param {SessionLive} sessionLive The Live Session object.
     * @returns A bool, true if streamSwitchManager contains current Live event to be played else false.
     */
    streamSwitcher(session: Session, sessionLive: SessionLive): Promise<boolean>;
    _initSwitching(state: any, session: any, sessionLive: any, scheduleObj: any): Promise<boolean>;
    _isEmpty(obj: any): boolean;
    _validURI(uri: any): Promise<boolean>;
    _loadPreroll(uri: any): Promise<{}>;
    _fetchParseM3u8(uri: any): Promise<any>;
    _mergeSegments(fromSegments: any, toSegments: any, prepend: any): {};
    _insertTimedMetadata(segments: any, timedMetadata: any): void;
}
