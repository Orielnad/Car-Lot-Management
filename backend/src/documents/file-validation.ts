/**
 * File upload validation (spec section 17: "קבצים | סריקת נוזקות, הגבלת
 * סוג וגודל, קישורים זמניים, מניעת גישה ישירה"). This implements the type
 * and size checks; malware scanning is NOT implemented — see the known-gap
 * note in docs/architecture.md. Pure and framework-free so it's testable
 * without spinning up Nest or touching disk.
 */

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const ALLOWED_MIME_TO_EXTENSIONS: Record<string, string[]> = {
  'application/pdf': ['pdf'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
};

export class FileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileValidationError';
  }
}

export interface FileToValidate {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

function extensionOf(filename: string): string {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

/**
 * Rejects a file whose size is over the limit, whose MIME type isn't on the
 * allow-list, or whose extension doesn't match its declared MIME type (a
 * client can lie about mimetype, but this at least catches an obvious
 * mismatch like "photo.exe" declared as image/png).
 */
export function assertValidUpload(file: FileToValidate): void {
  if (file.sizeBytes <= 0) {
    throw new FileValidationError('הקובץ ריק.');
  }
  if (file.sizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new FileValidationError(
      `הקובץ גדול מדי (מקסימום ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB).`,
    );
  }

  const allowedExtensions = ALLOWED_MIME_TO_EXTENSIONS[file.mimeType];
  if (!allowedExtensions) {
    throw new FileValidationError(
      'סוג קובץ לא נתמך. ניתן להעלות רק PDF, JPG או PNG.',
    );
  }

  const extension = extensionOf(file.originalName);
  if (!allowedExtensions.includes(extension)) {
    throw new FileValidationError(
      'סיומת הקובץ אינה תואמת לסוג הקובץ שדווח.',
    );
  }
}
