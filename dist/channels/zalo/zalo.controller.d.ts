import { ZaloQrStorageService } from './zalo-qr-storage.service';
import { ZaloAdapter } from './zalo.adapter';
export declare class ZaloController {
    private readonly adapter;
    private readonly qrStorage;
    constructor(adapter: ZaloAdapter, qrStorage: ZaloQrStorageService);
    startLogin(customerId: number): Promise<import("../channel-adapter.interface").StartLoginResult>;
    getQrBase64(): Promise<{
        qrBase64: string;
        qrPath: string;
        qrDir: string;
        rootDir: string;
    }>;
    status(botId: string): Promise<{
        status: import("../channel-adapter.interface").ChannelStatus;
    }>;
    logout(botId: string): Promise<{
        ok: boolean;
    }>;
}
