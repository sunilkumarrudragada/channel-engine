export = SessionLive;
declare class SessionLive {
    constructor(config: any, sessionLiveStore: any);
    sessionId: any;
    sessionLiveStateStore: any;
    instanceId: any;
    mediaSeqCount: number;
    prevMediaSeqCount: number;
    discSeqCount: number;
    prevDiscSeqCount: number;
    targetDuration: number;
    masterManifestUri: string;
    vodSegments: {};
    mediaManifestURIs: {};
    liveSegQueue: {};
    lastRequestedMediaSeqRaw: any;
    liveSourceM3Us: {};
    playheadState: 4;
    liveSegsForFollowers: {};
    timerCompensation: boolean;
    firstTime: boolean;
    allowedToSet: boolean;
    pushAmount: number;
    restAmount: number;
    waitForPlayhead: boolean;
    blockGenerateManifest: boolean;
    useDemuxedAudio: boolean;
    cloudWatchLogging: boolean;
    sessionLiveProfile: any;
    initAsync(): Promise<void>;
    sessionLiveState: any;
    /**
     *
     * @param {number} resetDelay The amount of time to wait before resetting the session.
     *
     */
    resetLiveStoreAsync(resetDelay: number): Promise<void>;
    resetSession(): Promise<void>;
    startPlayheadAsync(): Promise<void>;
    restartPlayheadAsync(): Promise<void>;
    stopPlayheadAsync(): Promise<void>;
    /**
     * This function sets the master manifest URI in sessionLive.
     * @param {string} masterManifestUri The master manifest URI.
     * @returns a boolean indicating whether the master manifest URI is reachable or not.
     */
    setLiveUri(masterManifestUri: string): Promise<boolean>;
    setCurrentMediaSequenceSegments(segments: any): Promise<boolean>;
    setCurrentMediaAndDiscSequenceCount(mediaSeq: any, discSeq: any): Promise<boolean>;
    getTransitionalSegments(): Promise<{}>;
    getCurrentMediaSequenceSegments(): Promise<{
        currMseqSegs: {};
        segCount: number;
    }>;
    getCurrentMediaAndDiscSequenceCount(): Promise<{
        mediaSeq: number;
        discSeq: number;
    }>;
    getStatus(): {
        sessionId: any;
        playhead: {
            state: any;
        };
    };
    getCurrentMediaManifestAsync(bw: any): Promise<string>;
    getCurrentAudioManifestAsync(audioGroupId: any, audioLanguage: any): Promise<string>;
    getCurrentSubtitleManifestAsync(subtitleGroupId: any, subtitleLanguage: any): Promise<string>;
    /**
     *
     * @param {string} masterManifestURI The master manifest URI.
     * @returns Loads the URIs to the different media playlists from the given master playlist.
     *
     */
    _loadMasterManifest(masterManifestURI: string): Promise<any>;
    _updateLiveSegQueue(): void;
    /**
     * This function adds new live segments to the node from which it can
     * generate new manifests from. Method for attaining new segments differ
     * depending on node Rank. The Leader collects from live source and
     * Followers collect from shared storage.
     *
     * @returns Nothing, but gives data to certain class-variables
     */
    _loadAllMediaManifests(): Promise<void>;
    _shiftSegments(opt: any): {
        totalDuration: number;
        removedSegments: number;
        removedDiscontinuities: number;
        shiftedSegments: {};
    };
    /**
     * Shifts V2L or LIVE items if total segment duration (V2L+LIVE) are over the target duration.
     * It will also update and increment SessionLive's MediaSeqCount and DiscSeqCount based
     * on what was shifted.
     * @param {string} instanceName Name of instance "LEADER" | "FOLLOWER"
     * @returns {number} The new total duration in seconds
     */
    _incrementAndShift(instanceName: string): number;
    _loadMediaManifest(bw: any): Promise<any>;
    _parseMediaManifest(m3u: any, mediaManifestUri: any, liveTargetBandwidth: any, isLeader: any): Promise<any>;
    /**
     * Collects 'new' PlaylistItems and converts them into custom SegmentItems,
     * then Pushes them to the LiveSegQueue for all variants.
     * @param {number} startIdx
     * @param {m3u8.Item.PlaylistItem} playlistItems
     * @param {string} baseUrl
     * @param {string} liveTargetBandwidth
     */
    _addLiveSegmentsToQueue(startIdx: number, playlistItems: m3u8.Item.PlaylistItem, baseUrl: string, liveTargetBandwidth: string, isLeader: any): void;
    _GenerateLiveManifest(bw: any): Promise<string>;
    _setMediaManifestTags(segments: any, m3u8: any, bw: any): any;
    _findNearestBw(bw: any, array: any): any;
    _getNearestBandwidth(bandwidthToMatch: any, array: any): any;
    _getFirstBwWithSegmentsInList(allSegments: any): string;
    _getMaxDuration(segments: any): number;
    _filterLiveProfiles(): void;
    _getAnyFirstSegmentDurationMs(): number;
    _isEmpty(obj: any): boolean;
    _containsSegment(segments: any, newSegments: any): boolean;
}
