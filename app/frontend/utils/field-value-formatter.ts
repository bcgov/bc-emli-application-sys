import { TFunction } from 'react-i18next';

export interface FormIOFileData {
  name?: string;
  originalName?: string;
  filename?: string;
  fileName?: string;
}

/**
 * Formats field values for display in revision contexts, with special handling for file uploads.
 * Handles primitive types, file objects/arrays, and falls back to generic messages for other objects.
 * @param fieldValue - The field value to format (strings, numbers, file objects, or arrays)
 * @param t - Translation function for localized strings
 * @returns Human-readable string representation of the field value
 */
export const formatFieldValue = (fieldValue: unknown, t: TFunction): string => {
  if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
    return t('energySavingsApplication.show.revision.noOriginalAnswer');
  }

  // Handle primitive values (strings, numbers, booleans)
  if (typeof fieldValue !== 'object') {
    return String(fieldValue);
  }

  // Handle arrays (typically multiple files)
  if (Array.isArray(fieldValue)) {
    if (fieldValue.length === 0) {
      return t('energySavingsApplication.show.revision.noOriginalAnswer');
    }

    const fileNames = fieldValue.map((file: FormIOFileData) => extractFileName(file, t)).filter(Boolean);

    return fileNames.length > 0 ? fileNames.join(', ') : t('fieldValue.fileCount', { count: fieldValue.length });
  }

  // Handle single objects (typically single file or other complex data)
  const fileName = extractFileName(fieldValue as FormIOFileData, t);
  if (fileName) {
    return fileName;
  }

  // For other object types, show generic message
  return t('fieldValue.complexObject');
};

/**
 * Extracts filename from a FormIO file object by checking common property names.
 * FormIO stores filenames in different properties depending on upload method and processing stage.
 * @param file - FormIO file data object
 * @param t - Translation function for localized fallback text
 * @returns The extracted filename or localized "Unnamed file" text
 */
const extractFileName = (file: FormIOFileData, t: TFunction): string => {
  // Try common filename properties in order of preference
  // 'name' is most common, 'originalName' often preserved from upload
  const fileName = file?.name || file?.originalName || file?.filename || file?.fileName;

  return fileName || t('fieldValue.unnamedFile');
};
