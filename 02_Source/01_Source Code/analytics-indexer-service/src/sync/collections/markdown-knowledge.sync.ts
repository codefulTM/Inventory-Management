/**
 * File: sync/collections/markdown-knowledge.sync.ts
 * Mục đích: Đồng bộ tài liệu Markdown vào Elasticsearch
 * 
 * KHÁC BIỆT: Collection này KHÔNG nằm trong MongoDB
 * - Đọc trực tiếp từ file system (thư mục 01_Documents)
 * - Chunk (phân mảnh) nội dung theo heading
 * - Tạo embedding vector cho từng chunk
 * - Index vào ES index: docs_knowledge_{YYYY}_{MM}
 * 
 * Quy trình xử lý một file Markdown:
 * 1. Đọc file từ disk
 * 2. Phân tách theo heading (#, ##, ###)
 * 3. Chia nhỏ (chunk) từng section theo quy tắc
 * 4. Enrich từng chunk (tạo embedding, metadata)
 * 5. Bulk index vào Elasticsearch
 * 
 * Đây là phần quan trọng cho tính năng RAG (Retrieval-Augmented Generation)
 */
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
// Quy tắc chunking cho docs_knowledge
import { PHASE1_CHUNKING_RULES } from '../../rag/rag-phase1.rules';
// Service làm giàu tài liệu (tạo embedding, metadata)
import { RagDocumentEnricherService } from '../../rag/rag-document-enricher.service';

/**
 * Cấu trúc một section trong Markdown (phân tách bởi heading)
 */
interface MarkdownSection {
  title?: string;    // Tiêu đề section (từ heading)
  text: string;       // Nội dung của section
}

@Injectable()
export class MarkdownKnowledgeSync {
  // Tên collection đích trong ES
  readonly collectionName = 'docs_knowledge';
  // Trường ngày sử dụng cho watermark (updated_at từ file mtime)
  readonly dateField = 'updated_at';
  
  private readonly logger = new Logger(MarkdownKnowledgeSync.name);
  private readonly markdownRoot: string;

  constructor(
    private readonly config: ConfigService,
    private readonly indexNaming: IndexNamingService,
    private readonly esBulk: ElasticsearchBulkService,
    // Service làm giàu RAG (tạo embedding, rag_text, metadata)
    private readonly ragEnricher: RagDocumentEnricherService,
  ) {
    // Đọc thư mục gốc chứa tài liệu Markdown từ config
    this.markdownRoot =
      this.config.get<string>('rag.markdown.rootDir') ??
      path.resolve(process.cwd(), '..', '..', '..', '01_Documents');
  }

  /**
   * Thực hiện đồng bộ tài liệu Markdown vào Elasticsearch
   * @param from - Watermark cũ (dựa trên file mtime)
   * @param to - Thời điểm kết thúc
   * @param batchSize - Kích thước lô
   * @param options - Tùy chọn
   * @returns Kết quả đồng bộ
   * 
   * Logic:
   * - Quét tất cả file .md trong markdownRoot (đệ quy)
   * - Lọc file theo thời gian sửa đổi (mtime)
   * - Đọc và chunk từng file
   * - Enrich và index từng chunk
   */
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

    // Tìm tất cả file Markdown
    const files = await this.findMarkdownFiles(this.markdownRoot);
    let batchDocs: Record<string, any>[] = [];

    for (const filePath of files) {
      const stat = await fs.stat(filePath);
      const updatedAt = stat.mtime;  // Thời gian sửa đổi file

      // Lọc file theo thời gian
      if (updatedAt > to) continue;           // File quá mới
      if (from && updatedAt <= from) continue;   // File quá cũ (đã sync)

      // Đọc nội dung file
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Chuyển đường dẫn thành relative path (để lưu vào ES)
      const relativePath = this.toPosix(path.relative(this.markdownRoot, filePath));
      
      // Phân tách theo heading
      const sections = this.splitByHeading(content);
      let chunkIndex = 0;

      // Xử lý từng section
      for (const section of sections) {
        // Chia nhỏ section thành các chunks
        const chunks = this.chunkSection(section.text);
        
        for (const chunkText of chunks) {
          // Enrich chunk (tạo embedding, metadata, rag_text)
          const enriched = await this.ragEnricher.enrichMarkdownChunk({
            path: relativePath,
            chunkText,
            chunkIndex,
            sectionTitle: section.title,
            updatedAt,
          });
          chunkIndex += 1;

          batchDocs.push(enriched);

          // Flush khi đạt kích thước batch
          if (batchDocs.length >= batchSize) {
            const flush = await this.flushBatch(batchDocs, dryRun);
            indexed += flush.indexed;
            errors += flush.errors;
            batchDocs = [];
          }
        }
      }
    }

    // Flush remaining docs
    if (batchDocs.length) {
      const flush = await this.flushBatch(batchDocs, dryRun);
      indexed += flush.indexed;
      errors += flush.errors;
    }

    const durationMs = Date.now() - start;
    this.logger.log(
      `[${this.collectionName}] Đồng bộ hoàn tất — indexed: ${indexed}, errors: ${errors}, duration: ${durationMs}ms, dryRun: ${dryRun}`,
    );

    return {
      collection: this.collectionName,
      indexed,
      deleted: 0,
      errors,
      durationMs,
    };
  }

  /**
   * Ghi một lô documents vào Elasticsearch
   * @param docs - Mảng documents đã enrich
   * @param dryRun - Chế độ chạy thử
   * @returns Số lượng indexed và errors
   * 
   * Gom nhóm theo index tháng và bulk index
   */
  private async flushBatch(
    docs: Record<string, any>[],
    dryRun: boolean,
  ): Promise<{ indexed: number; errors: number }> {
    if (!docs.length) return { indexed: 0, errors: 0 };
    if (dryRun) return { indexed: docs.length, errors: 0 };

    // Gom nhóm theo index tháng
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
    
    // Tùy chọn: đã enrich rồi, không cần enrich lại
    const options: ElasticsearchBulkIndexOptions = {
      collectionName: this.collectionName,
      alreadyEnriched: true,
    };

    // Bulk index từng index tháng
    for (const [indexName, bucket] of buckets.entries()) {
      const result = await this.esBulk.bulkIndex(indexName, bucket, options);
      indexed += result.indexed;
      errors += result.errors;
    }

    return { indexed, errors };
  }

  /**
   * Tìm tất cả file Markdown trong thư mục (đệ quy)
   * @param rootDir - Thư mục gốc để tìm
   * @returns Mảng đường dẫn tuyệt đối đến các file .md
   * 
   * Bỏ qua nếu thư mục không tồn tại
   */
  private async findMarkdownFiles(rootDir: string): Promise<string[]> {
    let entries;
    try {
      entries = await fs.readdir(rootDir, { withFileTypes: true });
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        this.logger.warn(
          `[${this.collectionName}] Không tìm thấy thư mục Markdown: ${rootDir}. Bỏ qua việc đồng bộ Markdown.`,
        );
        return [];
      }
      throw error;
    }

    const result: string[] = [];

    for (const entry of entries) {
      const fullPath = path.join(rootDir, entry.name);
      
      if (entry.isDirectory()) {
        // Đệ quy vào thư mục con
        const nested = await this.findMarkdownFiles(fullPath);
        result.push(...nested);
        continue;
      }

      // Chỉ lấy file .md
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        result.push(fullPath);
      }
    }

    return result;
  }

  /**
   * Phân tách nội dung Markdown theo heading
   * @param content - Nội dung Markdown
   * @returns Mảng các sections (mỗi section có title và text)
   * 
   * Mỗi heading (#, ##, ###) bắt đầu một section mới
   * Nội dung trước heading đầu tiên -> section không có title
   */
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
      // Phát hiện heading
      const heading = line.match(/^#{1,6}\s+(.+)$/);
      if (heading) {
        flush();  // Lưu section cũ
        currentTitle = heading[1].trim();
        continue;
      }
      buffer.push(line);
    }

    // Flush section cuối cùng
    flush();

    // Nếu không có heading nào -> toàn bộ nội dung là một section
    if (!sections.length && content.trim().length > 0) {
      return [{ text: content.trim() }];
    }

    return sections;
  }

  /**
   * Chia nhỏ (chunk) một đoạn text
   * @param text - Văn bản cần chunk
   * @returns Mảng các chunks
   * 
   * Sử dụng quy tắc từ PHASE1_CHUNKING_RULES:
   * - maxChars: kích thước tối đa mỗi chunk
   * - overlapChars: số ký tự overlap giữa các chunk
   */
  private chunkSection(text: string): string[] {
    const { maxChars, overlapChars } = PHASE1_CHUNKING_RULES.docs_knowledge;
    
    // Nếu text ngắn hơn maxChars -> trả về nguyên
    if (text.length <= maxChars) return [text];

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + maxChars, text.length);
      chunks.push(text.slice(start, end).trim());
      
      if (end === text.length) break;
      
      // Overlap: lùi lại overlapChars để đảm bảo ngữ cảnh
      start = Math.max(end - overlapChars, start + 1);
    }

    return chunks.filter(Boolean);
  }

  /**
   * Chuyển đường dẫn sang định dạng POSIX (sử dụng / thay vì \)
   */
  private toPosix(input: string): string {
    return input.split(path.sep).join('/');
  }
}
