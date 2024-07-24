export = SharedStateStore;
declare class SharedStateStore {
    constructor(type: any, opts: any, initData: any);
    initData: any;
    type: any;
    cache: {};
    cacheTTL: any;
    shared: boolean;
    hasPipeline: boolean;
    store: MemcachedStateStore | MemoryStateStore | RedisStateStore;
    isShared(): boolean;
    canPipeline(): boolean;
    init(id: any): Promise<void>;
    reset(id: any): Promise<void>;
    resetAll(): Promise<void>;
    get(id: any, key: any): Promise<any>;
    set(id: any, key: any, value: any): Promise<any>;
    setVolatile(id: any, key: any, value: any): Promise<any>;
    getValues(id: any, keys: any): Promise<{}>;
    setValues(id: any, data: any): Promise<{}>;
    remove(id: any, key: any): Promise<void>;
}
import MemcachedStateStore = require("./memcached_state_store.js");
import MemoryStateStore = require("./memory_state_store.js");
import RedisStateStore = require("./redis_state_store.js");
