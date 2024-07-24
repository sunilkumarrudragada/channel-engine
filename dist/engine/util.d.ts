export function filterQueryParser(filterQuery: any): {};
export function applyFilter(profiles: any, filter: any): any;
export function cloudWatchLog(silent: any, type: any, logEntry: any): void;
export function m3u8Header(instanceId: any): string;
export function toHHMMSS(secs: any): string;
export function logerror(sessionId: any, err: any): void;
export function timer(ms: any): Promise<any>;
export class WaitTimeGenerator {
    constructor(defaultIntervalMs: any, minValue: any);
    timestamp: Date;
    prevWaitTime: any;
    defaultIntervalMs: any;
    minValue: any;
    _getWaitTimeFromTimestamp(): number;
    getWaitTime(plannedTime: any): Promise<any>;
}
export function findNearestValue(val: any, array: any): any;
export function isValidUrl(url: any): boolean;
export function fetchWithRetry(uri: any, opts: any, maxRetries: any, retryDelayMs: any, timeoutMs: any, debug: any): Promise<any>;
export function codecsFromString(codecs: any): any[];
export function timeLeft(endTimestamp: any, currentTimestamp: any): string;
