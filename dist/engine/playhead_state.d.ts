export const PlayheadState: Readonly<{
    RUNNING: 1;
    STOPPED: 2;
    CRASHED: 3;
    IDLE: 4;
}>;
export class PlayheadStateStore extends SharedStateStore {
    constructor(opts: any);
    create(sessionId: any): Promise<SharedPlayheadState>;
}
import SharedStateStore = require("./shared_state_store.js");
declare class SharedPlayheadState {
    constructor(store: any, sessionId: any, opts: any);
    sessionId: any;
    store: any;
    state: 4;
    lastM3u8: any;
    get(key: any): Promise<any>;
    getState(): Promise<4>;
    getLastM3u8(): Promise<any>;
    getValues(keys: any): Promise<any>;
    set(key: any, value: any, isLeader: any): Promise<any>;
    setValues(keyValues: any, isLeader: any): Promise<any>;
    setState(newState: any): Promise<4>;
    setLastM3u8(m3u8: any): Promise<any>;
}
export {};
