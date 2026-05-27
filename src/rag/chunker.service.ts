import { Injectable } from '@nestjs/common';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

export interface Chunk {
  ordinal: number;
  content: string;
  tokenCount: number;
}

// Heuristic — 1 token ~ 4 chars for Latin script. Used only for the
// `tokenCount` column (display + later budgeting). Embedding model handles
// its own tokenization.
const APPROX_CHARS_PER_TOKEN = 4;
const TARGET_TOKENS = 500;
const OVERLAP_TOKENS = 50;

@Injectable()
export class ChunkerService {
  private readonly splitter: RecursiveCharacterTextSplitter;

  constructor() {
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: TARGET_TOKENS * APPROX_CHARS_PER_TOKEN,
      chunkOverlap: OVERLAP_TOKENS * APPROX_CHARS_PER_TOKEN,
      // Default separators already favor paragraph → sentence → word → char,
      // matching plan §10.1 ("split theo paragraph trước").
    });
  }

  async chunk(rawText: string): Promise<Chunk[]> {
    const normalized = rawText.replace(/\r\n?/g, '\n').trim();
    if (!normalized) return [];

    const parts = await this.splitter.splitText(normalized);
    return parts.map((content, idx) => ({
      ordinal: idx,
      content,
      tokenCount: Math.ceil(content.length / APPROX_CHARS_PER_TOKEN),
    }));
  }
}
