export declare class ZaloInstanceRegistry {
    private readonly map;
    set(botExternalId: string, api: unknown): void;
    get(botExternalId: string): unknown | undefined;
    has(botExternalId: string): boolean;
    delete(botExternalId: string): void;
    keys(): string[];
}
