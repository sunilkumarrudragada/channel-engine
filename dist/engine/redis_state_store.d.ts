export = RedisStateStore;
declare class RedisStateStore {
    constructor(keyPrefix: any, opts: any);
    keyPrefix: any;
    volatileKeyTTL: any;
    client: any;
    initAsync(id: any, initData: any): Promise<{}>;
    resetAsync(id: any, initData: any): Promise<void>;
    resetAllAsync(): Promise<void>;
    getValues(id: any, keys: any): Promise<{}>;
    getAsync(id: any, key: any): Promise<any>;
    setValues(id: any, data: any): Promise<{}>;
    setAsync(id: any, key: any, value: any): Promise<any>;
    setVolatileAsync(id: any, key: any, value: any): Promise<any>;
    removeAsync(id: any, key: any): Promise<void>;
}
