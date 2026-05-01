import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as path from 'path';

@Injectable()
export class InventoryAuditReportStorageService {
  constructor(private readonly configService: ConfigService) {}

  private getStorageRoot() {
    const configured = this.configService.get<string>(
      'AUDIT_REPORT_STORAGE_DIR',
    );
    if (configured && configured.trim()) {
      return configured;
    }

    return path.resolve(process.cwd(), 'storage', 'inventory-audit-reports');
  }

  async saveReport(reportId: string, signedPdf: Buffer) {
    const root = this.getStorageRoot();
    await fs.mkdir(root, { recursive: true });

    const fileName = `${reportId}.pdf`;
    const fullPath = path.join(root, fileName);

    await fs.writeFile(fullPath, signedPdf);

    // Mark as read-only to reduce accidental overwrite risk.
    try {
      await fs.chmod(fullPath, 0o444);
    } catch {
      // Ignore on environments/filesystems that do not support chmod semantics.
    }

    return {
      file_storage_key: fileName,
      absolute_path: fullPath,
      file_size_bytes: signedPdf.length,
    };
  }

  async readReport(fileStorageKey: string): Promise<Buffer> {
    const root = this.getStorageRoot();
    const fullPath = path.join(root, fileStorageKey);
    return fs.readFile(fullPath);
  }
}
