import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { IndexNamingService } from '../../elasticsearch/index-naming.service';
import {
  ElasticsearchBulkService,
  ElasticsearchBulkIndexOptions,
} from '../../elasticsearch/elasticsearch-bulk.service';
import { SyncExecutionOptions, SyncResult } from './base-collection-sync';
import { PHASE1_CHUNKING_RULES } from '../../rag/rag-phase1.rules';
import { RagDocumentEnricherService } from '../../rag/rag-document-enricher.service';

interface MarkdownSection {
  title?: string;
  text: string;
}

@Injectable()
export class MarkdownKnowledgeSync {
  readonly collectionName = 'docs_knowledge';
  readonly dateField = 'updated_at';
  private readonly logger = new Logger(MarkdownKnowledgeSync.name);
  private readonly markdownRoot: string;

  constructor(
    private readonly config: ConfigService,
    private readonly indexNaming: IndexNamingService,
    private readonly esBulk: ElasticsearchBulkService,
    private readonly ragEnricher: RagDocumentEnricherService,
  ) {
    this.markdownRoot =
      this.config.get<string>('rag.markdown.rootDir') ??
      path.resolve(process.cwd(), '..', '..', '..', '01_Documents');
  }

  async sync(
    from: Date | null,
    to: Date,
    batchSize: number,
    options: SyncExecutionOptions = {},
  ): Promise<SyncResult> {
    const start = Date.now();
    const dryRun = options.dryRun === true;

    let indexed = 0;
    let errors = 0;

    const files = await this.findMarkdownFiles(this.markdownRoot);
    let batchDocs: Record<string, any>[] = [];

    for (const filePath of files) {
      const stat = await fs.stat(filePath);
      const updatedAt = stat.mtime;

      if (updatedAt > to) continue;
      if (from && updatedAt <= from) continue;

      const content = await fs.readFile(filePath, 'utf-8');
      const relativePath = this.toPosix(path.relative(this.markdownRoot, filePath));
      const sections = this.splitByHeading(content);
      let chunkIndex = 0;

      for (const section of sections) {
        const chunks = this.chunkSection(section.text);
        for (const chunkText of chunks) {
          const enriched = await this.ragEnricher.enrichMarkdownChunk({
            path: relativePath,
            chunkText,
            chunkIndex,
            sectionTitle: section.title,
            updatedAt,
          });
          chunkIndex += 1;

          batchDocs.push(enriched);

          if (batchDocs.length >= batchSize) {
            const flush = await this.flushBatch(batchDocs, dryRun);
            indexed += flush.indexed;
            errors += flush.errors;
            batchDocs = [];
          }
        }
      }
    }

    if (batchDocs.length) {
      const flush = await this.flushBatch(batchDocs, dryRun);
      indexed += flush.indexed;
      errors += flush.errors;
    }

    const durationMs = Date.now() - start;
    this.logger.log(
      `[${this.collectionName}] Sync done — indexed: ${indexed}, errors: ${errors}, duration: ${durationMs}ms, dryRun: ${dryRun}`,
    );

    return {
      collection: this.collectionName,
      indexed,
      deleted: 0,
      errors,
      durationMs,
    };
  }

  private async flushBatch(
    docs: Record<string, any>[],
    dryRun: boolean,
  ): Promise<{ indexed: number; errors: number }> {
    if (!docs.length) return { indexed: 0, errors: 0 };
    if (dryRun) return { indexed: docs.length, errors: 0 };

    const buckets = new Map<string, Record<string, any>[]>();
    for (const doc of docs) {
      const date = doc.modified_date instanceof Date ? doc.modified_date : new Date();
      const indexName = this.indexNaming.getIndexName(this.collectionName, date);
      if (!buckets.has(indexName)) {
        buckets.set(indexName, []);
      }
      buckets.get(indexName)!.push(doc);
    }

    let indexed = 0;
    let errors = 0;
    const options: ElasticsearchBulkIndexOptions = {
      collectionName: this.collectionName,
      alreadyEnriched: true,
    };

    for (const [indexName, bucket] of buckets.entries()) {
      const result = await this.esBulk.bulkIndex(indexName, bucket, options);
      indexed += result.indexed;
      errors += result.errors;
    }

    return { indexed, errors };
  }

  private async findMarkdownFiles(rootDir: string): Promise<string[]> {
    let entries;
    try {
      entries = await fs.readdir(rootDir, { withFileTypes: true });
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        this.logger.warn(
          `[${this.collectionName}] Markdown root not found: ${rootDir}. Skip markdown ingestion.`,
        );
        return [];
      }
      throw error;
    }

    const result: string[] = [];

    for (const entry of entries) {
      const fullPath = path.join(rootDir, entry.name);
      if (entry.isDirectory()) {
        const nested = await this.findMarkdownFiles(fullPath);
        result.push(...nested);
        continue;
      }

      if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        result.push(fullPath);
      }
    }

    return result;
  }

  private splitByHeading(content: string): MarkdownSection[] {
    const lines = content.split(/\r?\n/);
    const sections: MarkdownSection[] = [];
    let currentTitle: string | undefined;
    let buffer: string[] = [];

    const flush = () => {
      const text = buffer.join('\n').trim();
      if (!text) {
        buffer = [];
        return;
      }
      sections.push({ title: currentTitle, text });
      buffer = [];
    };

    for (const line of lines) {
      const heading = line.match(/^#{1,6}\s+(.+)$/);
      if (heading) {
        flush();
        currentTitle = heading[1].trim();
        continue;
      }
      buffer.push(line);
    }

    flush();

    if (!sections.length && content.trim().length > 0) {
      return [{ text: content.trim() }];
    }

    return sections;
  }

  private chunkSection(text: string): string[] {
    const { maxChars, overlapChars } = PHASE1_CHUNKING_RULES.docs_knowledge;
    if (text.length <= maxChars) return [text];

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + maxChars, text.length);
      chunks.push(text.slice(start, end).trim());
      if (end === text.length) break;
      start = Math.max(end - overlapChars, start + 1);
    }

    return chunks.filter(Boolean);
  }

  private toPosix(input: string): string {
    return input.split(path.sep).join('/');
  }
}
