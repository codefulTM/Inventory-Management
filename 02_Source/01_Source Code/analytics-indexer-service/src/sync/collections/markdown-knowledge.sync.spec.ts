import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { MarkdownKnowledgeSync } from './markdown-knowledge.sync';

describe('MarkdownKnowledgeSync', () => {
  const mockIndexNaming = {
    getIndexName: jest.fn().mockReturnValue('docs_knowledge_2026_04'),
  };

  const mockEsBulk = {
    bulkIndex: jest.fn().mockResolvedValue({ indexed: 1, deleted: 0, errors: 0 }),
  };

  const mockRagEnricher = {
    enrichMarkdownChunk: jest.fn().mockImplementation(async (input: any) => ({
      id: `${input.path}#${input.chunkIndex}`,
      path: input.path,
      chunk_index: input.chunkIndex,
      section_title: input.sectionTitle ?? null,
      rag_text: input.chunkText,
      source_type: 'markdown',
      source_id: `${input.path}#${input.chunkIndex}`,
      source_collection: 'docs_knowledge',
      rag_metadata: {
        path: input.path,
        chunk_index: input.chunkIndex,
        section_title: input.sectionTitle ?? null,
      },
      acl_tags: ['role:manager'],
      updated_at: new Date(),
      created_date: new Date(),
      modified_date: new Date(),
      embedding: [0.1, 0.2],
    })),
  };

  const toDate = (value: string) => new Date(value);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns zero when markdown root does not exist', async () => {
    const config = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'rag.markdown.rootDir') return path.join(os.tmpdir(), 'not-found-md-root');
        return undefined;
      }),
    };

    const service = new MarkdownKnowledgeSync(
      config as any,
      mockIndexNaming as any,
      mockEsBulk as any,
      mockRagEnricher as any,
    );

    const result = await service.sync(null, toDate('2026-04-20T00:00:00.000Z'), 10, {
      dryRun: true,
    });

    expect(result.collection).toBe('docs_knowledge');
    expect(result.indexed).toBe(0);
    expect(result.errors).toBe(0);
  });

  it('ingests markdown content in dry-run mode without hitting ES', async () => {
    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'rag-md-'));
    const markdownPath = path.join(tmpRoot, 'sample.md');
    await fs.writeFile(markdownPath, '# Heading\n\nThis is markdown content for sync.', 'utf-8');

    const config = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'rag.markdown.rootDir') return tmpRoot;
        return undefined;
      }),
    };

    const service = new MarkdownKnowledgeSync(
      config as any,
      mockIndexNaming as any,
      mockEsBulk as any,
      mockRagEnricher as any,
    );

    const result = await service.sync(null, new Date(Date.now() + 1000), 10, {
      dryRun: true,
    });

    expect(result.indexed).toBeGreaterThan(0);
    expect(mockEsBulk.bulkIndex).not.toHaveBeenCalled();
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  it('indexes markdown chunks to Elasticsearch when dryRun is false', async () => {
    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'rag-md-'));
    const markdownPath = path.join(tmpRoot, 'architecture.md');
    await fs.writeFile(markdownPath, '# Architecture\n\nChunk body for indexing.', 'utf-8');

    const config = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'rag.markdown.rootDir') return tmpRoot;
        return undefined;
      }),
    };

    const service = new MarkdownKnowledgeSync(
      config as any,
      mockIndexNaming as any,
      mockEsBulk as any,
      mockRagEnricher as any,
    );

    const result = await service.sync(null, new Date(Date.now() + 1000), 10);

    expect(result.indexed).toBeGreaterThan(0);
    expect(mockEsBulk.bulkIndex).toHaveBeenCalledWith(
      'docs_knowledge_2026_04',
      expect.any(Array),
      expect.objectContaining({ collectionName: 'docs_knowledge', alreadyEnriched: true }),
    );

    await fs.rm(tmpRoot, { recursive: true, force: true });
  });
});
