import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';

const STORAGE_ROOT = path.resolve(__dirname, '..', '..', 'storage', 'documents');

/**
 * Local-disk file storage for MVP. In production this becomes an adapter
 * over S3-compatible storage (see docs/architecture.md) — kept behind this
 * one class so swapping the backend later doesn't touch DocumentsService.
 * Never trusts the caller's filename for the path: always writes under a
 * fresh random name, so there's no path-traversal or overwrite risk.
 */
@Injectable()
export class FileStorageService {
  async save(buffer: Buffer, originalName: string): Promise<string> {
    await fs.mkdir(STORAGE_ROOT, { recursive: true });

    const extension = path.extname(originalName).toLowerCase();
    const storedFileName = `${randomUUID()}${extension}`;
    const fullPath = path.join(STORAGE_ROOT, storedFileName);

    await fs.writeFile(fullPath, buffer);
    return storedFileName;
  }

  async read(storedFileName: string): Promise<Buffer> {
    this.assertSafeFileName(storedFileName);
    return fs.readFile(path.join(STORAGE_ROOT, storedFileName));
  }

  /** Defense in depth: storedFileName always comes from our own randomUUID(),
   *  but this blocks any path-traversal attempt if that assumption is ever
   *  violated (e.g. a future caller passing a raw user-supplied name). */
  private assertSafeFileName(storedFileName: string): void {
    if (storedFileName.includes('/') || storedFileName.includes('..')) {
      throw new Error('Invalid stored file name');
    }
  }
}
