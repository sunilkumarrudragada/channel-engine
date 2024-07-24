export interface ChannelEngineOpts {
    defaultSlateUri?: string;
    slateRepetitions?: number;
    slateDuration?: number;
    redisUrl?: string;
    memcachedUrl?: string;
    sharedStoreCacheTTL?: number;
    heartbeat?: string;
    channelManager: IChannelManager;
    streamSwitchManager?: IStreamSwitchManager;
    cacheTTL?: number;
    playheadDiffThreshold?: number;
    maxTickInterval?: number;
    cloudWatchMetrics?: boolean;
    useDemuxedAudio?: boolean;
    dummySubtitleEndpoint?: string;
    subtitleSliceEndpoint?: string;
    useVTTSubtitles?: boolean;
    vttBasePath?: string;
    alwaysNewSegments?: boolean;
    partialStoreHLSVod?: boolean;
    alwaysMapBandwidthByNearest?: boolean;
    diffCompensationRate?: number;
    staticDirectory?: string;
    averageSegmentDuration?: number;
    targetDurationPadding?: boolean;
    forceTargetDuration?: boolean;
    adCopyMgrUri?: string;
    adXchangeUri?: string;
    noSessionDataTags?: boolean;
    volatileKeyTTL?: number;
    autoCreateSession?: boolean;
    sessionResetKey?: string;
    keepAliveTimeout?: number;
    sessionEventStream?: boolean;
    sessionHealthKey?: string;
}
export interface VodRequest {
    sessionId: string;
    category?: string;
    playlistId: string;
}
export interface VodResponseMetadata {
    id: string;
    title: string;
}
export interface VodTimedMetadata {
    'start-date': string;
    'x-schedule-end'?: string;
    'x-title'?: string;
    'x-channelid'?: string;
    'class': string;
}
export interface LiveTimedMetadata {
    'id': string;
    'start-date': string;
    'x-title'?: string;
}
export interface VodResponse {
    title: any;
    id: string;
    uri: string;
    offset?: number;
    diffMs?: number;
    desiredDuration?: number;
    startOffset?: number;
    type?: string;
    currentMetadata?: VodResponseMetadata;
    timedMetadata?: VodTimedMetadata;
    unixTs?: number;
}
export interface IAssetManager {
    getNextVod: (vodRequest: VodRequest) => Promise<VodResponse>;
    handleError?: (err: string, vodResponse: VodResponse) => void;
}
export interface ChannelProfile {
    bw: number;
    codecs: string;
    resolution: number[];
    channels?: string;
}
export interface Channel {
    id: string;
    profile: ChannelProfile[];
    audioTracks?: AudioTracks[];
    subtitleTracks?: SubtitleTracks[];
    closedCaptions?: ClosedCaptions[];
}
export interface ClosedCaptions {
    id: string;
    lang: string;
    name: string;
    default?: boolean;
    auto?: boolean;
}
export interface AudioTracks {
    language: string;
    name: string;
    default?: boolean;
    enforceAudioGroupId?: string;
}
export interface SubtitleTracks {
    language: string;
    name: string;
    default?: boolean;
}
export interface IChannelManager {
    getChannels: () => Channel[];
    autoCreateChannel?: (channelId: string) => void;
}
export declare enum ScheduleStreamType {
    LIVE = 1,
    VOD = 2
}
export interface ScheduleOptions {
    startOffset?: number;
}
export interface Schedule {
    eventId: string;
    assetId: string;
    title: string;
    type: ScheduleStreamType;
    start_time: number;
    end_time: number;
    uri: string;
    duration?: number;
    timedMetadata?: LiveTimedMetadata;
    options?: ScheduleOptions;
}
export interface IStreamSwitchManager {
    getSchedule: (channelId: string) => Promise<Schedule[]>;
}
export declare class ChannelEngine {
    private options?;
    private useDemuxedAudio;
    private dummySubtitleEndpoint;
    private subtitleSliceEndpoint;
    private useVTTSubtitles;
    private alwaysNewSegments;
    private partialStoreHLSVod;
    private alwaysMapBandwidthByNearest;
    private defaultSlateUri?;
    private slateDuration?;
    private assetMgr;
    private streamSwitchManager?;
    private slateRepetitions?;
    private monitorTimer;
    private server;
    private serverStartTime;
    private instanceId;
    private streamSwitchTimeIntervalMs;
    private sessionStore;
    private sessionLiveStore;
    private streamerOpts;
    private logCloudWatchMetrics;
    private adCopyMgrUri?;
    private adXchangeUri?;
    private autoCreateSession;
    private sessionResetKey;
    private sessionEventStream;
    private sessionHealthKey;
    constructor(assetMgr: IAssetManager, options?: ChannelEngineOpts);
    updateStreamSwitchAsync(): Promise<void>;
    updateChannelsAsync(channelMgr: any, options: any): Promise<void>;
    start(): void;
    listen(port: any): void;
    getStatusForSessionAsync(sessionId: any): Promise<any>;
    getSessionCount(): number;
    getPlayheadCount(): number;
    _monitorAsync(session: any, sessionLive: any): Promise<void>;
    createChannel(channelId: any): Promise<void>;
    getMasterManifest(channelId: any): Promise<any>;
    getMediaManifests(channelId: any): Promise<{}>;
    getAudioManifests(channelId: any): Promise<{}>;
    getSubtitleManifests(channelId: any): Promise<{}>;
    _handleHeartbeat(req: any, res: any, next: any): void;
    _handleMasterManifest(req: any, res: any, next: any): Promise<void>;
    _handleAudioManifest(req: any, res: any, next: any): Promise<void>;
    _handleSubtitleManifest(req: any, res: any, next: any): Promise<void>;
    _handleDummySubtitleEndpoint(req: any, res: any, next: any): Promise<void>;
    _handleSubtitleSliceEndpoint(req: any, res: any, next: any): Promise<void>;
    _handleMediaManifest(req: any, res: any, next: any): Promise<void>;
    _handleEventStream(req: any, res: any, next: any): void;
    _handleStatus(req: any, res: any, next: any): Promise<void>;
    _handleAggregatedSessionHealth(req: any, res: any, next: any): Promise<void>;
    _handleSessionHealth(req: any, res: any, next: any): Promise<void>;
    _handleSessionsReset(req: any, res: any, next: any): Promise<void>;
    _handleSessionReset(req: any, res: any, next: any): Promise<void>;
    _gracefulErrorHandler(errMsg: any): any;
    _errorHandler(errMsg: any): any;
}
