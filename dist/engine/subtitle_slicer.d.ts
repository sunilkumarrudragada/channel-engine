export = SubtitleSlicer;
declare class SubtitleSlicer {
    vttFiles: {};
    getVttFile(url: any): Promise<any>;
    checkTimeStamp(line: any, startTime: any, endTime: any, elapsedtime: any): boolean;
    streamToString(stream: any): Promise<any>;
    generateVtt(params: any, _injectedVttFile: any, _injectedPreviousVttFile: any): Promise<string>;
}
