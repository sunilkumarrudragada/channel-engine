export const SessionState: Readonly<{
    VOD_INIT: 1;
    VOD_PLAYING: 2;
    VOD_NEXT_INIT: 3;
    VOD_NEXT_INITIATING: 4;
    VOD_RELOAD_INIT: 5;
    VOD_RELOAD_INITIATING: 6;
}>;
export class SessionStateStore extends SharedStateStore {
    constructor(opts: any);
    cache: {
        leader: {
            ts: number;
            value: any;
        };
    };
    ping(instanceId: any): Promise<void>;
    clearLeaderCache(): Promise<void>;
    isLeader(instanceId: any): Promise<boolean>;
    create(sessionId: any, instanceId: any): Promise<SharedSessionState>;
}
import SharedStateStore = require("./shared_state_store.js");
declare class SharedSessionState {
    constructor(store: any, sessionId: any, instanceId: any, opts: any);
    sessionId: any;
    instanceId: any;
    cache: {
        currentVod: {
            ts: number;
            ttl: number;
            value: any;
        };
    };
    cacheTTL: any;
    store: any;
    clearCurrentVodCache(): Promise<void>;
    getCurrentVod(): Promise<any>;
    setCurrentVod(hlsVod: any, opts: any): Promise<any>;
    get(key: any): Promise<any>;
    getValues(keys: any): Promise<any>;
    set(key: any, value: any): Promise<any>;
    setValues(keyValues: any): Promise<any>;
    remove(key: any): Promise<void>;
    increment(key: any, inc: any): Promise<any>;
}
export {};
