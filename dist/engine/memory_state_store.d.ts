export = MemoryStateStore;
declare class MemoryStateStore {
    constructor(type: any, opts: any);
    sharedStates: {};
    globalSharedStates: {};
    initAsync(id: any, initData: any): Promise<any>;
    resetAsync(id: any, initData: any): Promise<void>;
    resetAllAsync(): Promise<void>;
    getAsync(id: any, key: any): Promise<any>;
    setAsync(id: any, key: any, value: any): Promise<any>;
    setVolatileAsync(id: any, key: any, value: any): Promise<any>;
    removeAsync(id: any, key: any): Promise<void>;
}
