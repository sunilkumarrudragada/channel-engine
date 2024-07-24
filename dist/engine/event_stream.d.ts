export = EventStream;
declare class EventStream {
    constructor(session: any);
    _session: any;
    poll(): Promise<any>;
}
