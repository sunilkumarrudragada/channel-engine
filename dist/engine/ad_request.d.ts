export = AdRequest;
declare class AdRequest {
    constructor(adCopyMgrUri: any, adXchangeUri: any);
    _adCopyMgrUri: any;
    _adXchangeUri: any;
    _splices: any[];
    resolve(): Promise<any>;
    get splices(): any[];
    _requestBreaks(): Promise<any>;
    _requestAdsFromXchange(): Promise<any>;
    _requestAds(): Promise<any>;
    _fillBreak(adbreak: any): Promise<any>;
    _getAdById(ad: any): Promise<any>;
}
