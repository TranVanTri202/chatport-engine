export interface Chunk {
    ordinal: number;
    content: string;
    tokenCount: number;
}
export declare class ChunkerService {
    private readonly splitter;
    constructor();
    chunk(rawText: string): Promise<Chunk[]>;
}
