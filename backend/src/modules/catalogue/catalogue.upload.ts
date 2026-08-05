import {randomUUID} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {open} from 'node:fs/promises';
import {resolve} from 'node:path';
import multer from 'multer';
import {AppError} from '../../lib/errors.js';

export const productUploadDirectory = resolve(process.cwd(), 'uploads', 'products');
mkdirSync(productUploadDirectory, {recursive: true});

const extensions: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export const uploadProductImage = multer({
  storage: multer.diskStorage({
    destination: productUploadDirectory,
    filename: (_request, file, callback) => callback(null, `${randomUUID()}${extensions[file.mimetype] ?? ''}`),
  }),
  limits: {files: 1, fileSize: 5 * 1024 * 1024},
  fileFilter: (_request, file, callback) => {
    if (!extensions[file.mimetype]) {
      callback(new AppError(415, 'Only JPEG, PNG and WebP product images are allowed', 'UNSUPPORTED_IMAGE'));
      return;
    }
    callback(null, true);
  },
}).single('image');

export async function validateProductImage(filePath: string, mimeType: string) {
  const handle = await open(filePath, 'r');
  try {
    const bytes = Buffer.alloc(12);
    await handle.read(bytes, 0, bytes.length, 0);
    const valid =
      (mimeType === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
      (mimeType === 'image/png' && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) ||
      (mimeType === 'image/webp' && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP');
    if (!valid) throw new AppError(415, 'Uploaded file content is not a valid JPEG, PNG or WebP image', 'INVALID_IMAGE');
  } finally {
    await handle.close();
  }
}
