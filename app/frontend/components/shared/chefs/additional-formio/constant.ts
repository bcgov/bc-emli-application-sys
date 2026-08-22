export const FILE_UPLOAD_CHUNK_SIZE =
  (import.meta.env.VITE_FILE_UPLOAD_CHUNK_SIZE && parseFloat(import.meta.env.VITE_FILE_UPLOAD_CHUNK_SIZE)) || 10;
export const FILE_UPLOAD_CHUNK_SIZE_IN_BYTES = FILE_UPLOAD_CHUNK_SIZE * 1024 * 1024;
export const FILE_UPLOAD_MAX_SIZE =
  (import.meta.env.VITE_FILE_UPLOAD_MAX_SIZE && parseFloat(import.meta.env.VITE_FILE_UPLOAD_MAX_SIZE)) || 100;
export const MAX_NUMBER_OF_PARTS = FILE_UPLOAD_MAX_SIZE / FILE_UPLOAD_CHUNK_SIZE;
// Mirrors the server-side whitelist in app/uploaders/file_uploader.rb. Enforced on both
// sides for the same reason FILE_UPLOAD_MAX_SIZE is: the client check fails fast, the
// server check is the one that counts. Form.io reads this as `filePattern`, which also
// drives the file picker's accept filter and the browse control's accessible name.
export const FILE_UPLOAD_ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.img', '.pdf', '.xlsx', '.xls', '.txt'];
export const FILE_UPLOAD_FILE_PATTERN = FILE_UPLOAD_ALLOWED_EXTENSIONS.join(',');
