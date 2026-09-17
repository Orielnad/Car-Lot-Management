import { assertValidUpload, FileValidationError, MAX_FILE_SIZE_BYTES } from './file-validation';

describe('assertValidUpload', () => {
  it('accepts a valid PDF', () => {
    expect(() =>
      assertValidUpload({
        originalName: 'contract.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
      }),
    ).not.toThrow();
  });

  it('accepts a valid JPEG', () => {
    expect(() =>
      assertValidUpload({
        originalName: 'photo.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1024,
      }),
    ).not.toThrow();
  });

  it('rejects an empty file', () => {
    expect(() =>
      assertValidUpload({ originalName: 'x.pdf', mimeType: 'application/pdf', sizeBytes: 0 }),
    ).toThrow(FileValidationError);
  });

  it('rejects a file over the size limit', () => {
    expect(() =>
      assertValidUpload({
        originalName: 'huge.pdf',
        mimeType: 'application/pdf',
        sizeBytes: MAX_FILE_SIZE_BYTES + 1,
      }),
    ).toThrow(/גדול מדי/);
  });

  it('rejects an unsupported MIME type (e.g. an executable)', () => {
    expect(() =>
      assertValidUpload({
        originalName: 'virus.exe',
        mimeType: 'application/x-msdownload',
        sizeBytes: 1024,
      }),
    ).toThrow(FileValidationError);
  });

  it('rejects a mismatch between the declared MIME type and the file extension', () => {
    expect(() =>
      assertValidUpload({
        originalName: 'disguised.exe',
        mimeType: 'image/png', // client lies about the type
        sizeBytes: 1024,
      }),
    ).toThrow(/סיומת/);
  });

  it('is case-insensitive about the extension', () => {
    expect(() =>
      assertValidUpload({
        originalName: 'SCAN.PDF',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
      }),
    ).not.toThrow();
  });
});
