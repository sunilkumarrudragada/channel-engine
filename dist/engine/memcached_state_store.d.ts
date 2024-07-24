export = MemcachedStateStore;
declare class MemcachedStateStore {
    constructor(keyPrefix: any, opts: any);
    keyPrefix: any;
    client: any;
    initAsync(id: any, initData: any): Promise<{}>;
    resetAsync(id: any, initData: any): Promise<void>;
    resetAllAsync(): Promise<void>;
    getAsync(id: any, key: any): Promise<any>;
    setAsync(id: any, key: any, value: any): Promise<any>;
    setVolatileAsync(id: any, key: any, value: any): Promise<void>;
    removeAsync(id: any, key: any): Promise<void>;
}
