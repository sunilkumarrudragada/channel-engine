export = Session;
declare class Session {
    /**
     *
     * config: {
     *   startWithId,
     * }
     *
     */
    constructor(assetManager: any, config: any, sessionStore: any);
    _assetManager: any;
    _sessionId: any;
    _sessionStateStore: any;
    _playheadStateStore: any;
    _instanceId: any;
    currentMetadata: {};
    _events: any[];
    averageSegmentDuration: any;
    use_demuxed_audio: boolean;
    use_vtt_subtitles: any;
    dummySubtitleEndpoint: any;
    subtitleSliceEndpoint: any;
    cloudWatchLogging: boolean;
    playheadDiffThreshold: any;
    maxTickInterval: any;
    maxTickIntervalIsDefault: boolean;
    diffCompensationRate: any;
    diffCompensation: any;
    timePositionOffset: number;
    prevVodMediaSeq: {
        video: any;
        audio: any;
        subtitle: any;
    };
    prevMediaSeqOffset: {
        video: any;
        audio: any;
        subtitle: any;
    };
    waitingForNextVod: boolean;
    leaderIsSettingNextVod: boolean;
    isSwitchingBackToV2L: boolean;
    switchDataForSession: {
        mediaSeq: any;
        discSeq: any;
        mediaSeqOffset: any;
        transitionSegments: any;
        reloadBehind: any;
    };
    isAllowedToClearVodCache: boolean;
    alwaysNewSegments: any;
    alwaysMapBandwidthByNearest: any;
    partialStoreHLSVod: any;
    currentPlayheadRef: any;
    _category: any;
    startWithId: any;
    _sessionProfile: any;
    _audioTracks: any;
    _subtitleTracks: any;
    _closedCaptions: any;
    _noSessionDataTags: any;
    _sessionEventStream: any;
    slateUri: any;
    slateRepetitions: any;
    slateDuration: any;
    disabledPlayhead: boolean;
    targetDurationPadding: any;
    forceTargetDuration: any;
    initAsync(): Promise<void>;
    _sessionState: any;
    _playheadState: any;
    get sessionId(): any;
    startPlayheadAsync(): Promise<void>;
    restartPlayheadAsync(): Promise<void>;
    stopPlayheadAsync(): Promise<void>;
    getStatusAsync(): Promise<{
        sessionId: any;
        playhead: {
            state: any;
            tickMs: any;
            mediaSeq: any;
        };
        slateInserted: any;
    } | {
        sessionId: any;
    }>;
    resetAsync(id: any): Promise<void>;
    getSessionState(): Promise<any>;
    getTruncatedVodSegments(vodUri: any, duration: any): Promise<any>;
    getTruncatedVodSegmentsWithOptions(vodUri: any, duration: any, options: any): Promise<any>;
    setCurrentMediaSequenceSegments(segments: any, mSeqOffset: any, reloadBehind: any): Promise<void>;
    getCurrentMediaSequenceSegments(opts: any): Promise<any>;
    setCurrentMediaAndDiscSequenceCount(_mediaSeq: any, _discSeq: any): Promise<void>;
    getCurrentMediaAndDiscSequenceCount(): Promise<{
        mediaSeq: any;
        discSeq: any;
        vodMediaSeqVideo: any;
    }>;
    getCurrentMediaManifestAsync(bw: any, playbackSessionId: any): Promise<any>;
    getCurrentAudioManifestAsync(audioGroupId: any, audioLanguage: any, playbackSessionId: any): Promise<any>;
    getCurrentSubtitleManifestAsync(subtitleGroupId: any, subtitleLanguage: any, playbackSessionId: any): Promise<any>;
    incrementAsync(): Promise<any>;
    getMediaManifestAsync(bw: any, opts: any): Promise<any>;
    getAudioManifestAsync(audioGroupId: any, audioLanguage: any, opts: any): Promise<any>;
    getMasterManifestAsync(filter: any): Promise<string>;
    getAudioGroupsAndLangs(): Promise<{}>;
    getSubtitleGroupsAndLangs(): Promise<{}>;
    consumeEvent(): any;
    produceEvent(event: any): void;
    hasPlayhead(): boolean;
    _insertSlate(currentVod: any): Promise<any>;
    _tickAsync(): Promise<void>;
    _getNextVod(): Promise<any>;
    _loadSlate(afterVod: any, reps: any): Promise<any>;
    _truncateVod(vodResponse: any): Promise<any>;
    _truncateSlate(afterVod: any, requestedDuration: any, vodUri: any): Promise<any>;
    _truncateSlateWithOptions(afterVod: any, requestedDuration: any, vodUri: any, options: any): Promise<any>;
    _fillGap(afterVod: any, desiredDuration: any): Promise<any>;
    _getNextVodById(id: any): Promise<any>;
    _getFirstDuration(manifest: any): Promise<any>;
    _getCurrentDeltaTime(): Promise<any>;
    _getCurrentPlayheadPosition(): Promise<any>;
    _getAudioPlayheadPosition(seqIdx: any): Promise<any>;
    _getSubtitlePlayheadPosition(seqIdx: any): Promise<any>;
    _getLastDuration(manifest: any): Promise<any>;
    _getPlayheadDiffCompensationValue(diffMs: any, thresholdMs: any): number;
    _isOldVod(refTs: any, vodDur: any): boolean;
    _determineExtraMediaIncrement(_extraType: any, _currentPosVideo: any, _extraSeqFinalIndex: any, _vodMediaSeqExtra: any, _getExtraPlayheadPositionAsyncFn: any): Promise<{
        increment: number;
        position: number;
        diff: string;
    }>;
    _getM3u8File(variantType: any, variantKey: any, playbackSessionId: any): Promise<any>;
    _getCurrentVodData(dataName: any, variantType: any, vod: any): any;
}
