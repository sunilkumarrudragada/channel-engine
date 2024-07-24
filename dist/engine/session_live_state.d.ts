export class SessionLiveStateStore extends SharedStateStore {
    constructor(opts: any);
    cache: {
        leader: {
            ts: number;
            value: any;
        };
    };
    ping(instanceId: any): Promise<void>;
    setLeader(instanceId: any): Promise<any>;
    isLeader(instanceId: any): Promise<boolean>;
    create(sessionId: any, instanceId: any): Promise<SharedSessionLiveState>;
}
import SharedStateStore = require("./shared_state_store.js");
declare class SharedSessionLiveState {
    constructor(store: any, sessionId: any, instanceId: any, opts: any);
    sessionId: any;
    instanceId: any;
    store: any;
    get(key: any): Promise<any>;
    set(key: any, value: any): Promise<any>;
    remove(key: any): Promise<void>;
}
export {};
