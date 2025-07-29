import {
  FILE_UPLOAD_CHUNK_SIZE_IN_BYTES,
  MAX_NUMBER_OF_PARTS,
} from '../components/shared/chefs/additional-formio/constant';
import { getCsrfToken } from './utility-functions';

const sleep = (delay: number) => new Promise((resolve) => setTimeout(resolve, delay));

export const uploadFile = async (file: File, fileName: string, progressCallback?: (event: ProgressEvent) => void) => {
  // Use direct upload with presigned URLs
  console.log('Using direct upload with presigned URLs');
  return await directUpload(file, fileName, progressCallback);
};

// Direct upload function using presigned URLs
export const directUpload = async (file: File, fileName: string, progressCallback?: (event: ProgressEvent) => void) => {
  try {
    // Step 1: Request presigned URL
    const presignResponse = await requestPresignedUrl(file, fileName);

    if (!presignResponse.ok) {
      throw new Error('Failed to get presigned URL');
    }

    const presignData = await presignResponse.json();

    // Step 2: Upload directly to S3 using the presigned URL
    await uploadFileOneChunk(presignData.url, presignData.headers, file);

    // Step 3: Call progress callback to indicate completion
    if (progressCallback) {
      progressCallback(new ProgressEvent('progress', { lengthComputable: true, loaded: 1, total: 1 }));
    }

    // Return the response in the same format as expected by the frontend
    return {
      id: presignData.key,
      key: presignData.key,
      storage: 'cache',
      metadata: {
        filename: fileName,
        size: file.size,
        mime_type: file.type,
      },
      url: presignData.url,
      headers: presignData.headers,
      signed_url: presignData.signed_url,
    };
  } catch (error) {
    console.error('Direct upload failed:', error);
    throw error;
  }
};

export const requestPresignedUrl = async (file: File, fileName: string) => {
  try {
    const params = new URLSearchParams({
      filename: fileName,
      type: file.type,
      size: file.size.toString(),
      // checksum: file.checksum,
    });

    return fetch(`/api/storage/s3?${params.toString()}`, {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  } catch (error) {
    throw error;
  }
};

export const uploadFileOneChunk = async (signedUrl: string, headers: any, file: File) => {
  try {
    const response = await fetch(signedUrl, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: Object.assign({}, headers, {
        'Content-Length': file.size,
        'Transfer-Encoding': 'chunked',
      }),
      body: file,
    });

    if (!response.ok) {
      throw new Error(`Upload file failed.`);
    }
    return;
  } catch (error) {
    throw error;
  }
};

export const requestMultipart = async (file: File, fileName: string) => {
  try {
    const params = JSON.stringify({
      filename: fileName,
      type: file.type,
      size: file.size,
    });

    return fetch(`/api/storage/s3/multipart`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'X-CSRF-Token': getCsrfToken(),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: params,
    });
  } catch (error) {
    throw error;
  }
};

export const getMultipartProgress = async (uploadId: string) => {
  try {
    return fetch(`/api/storage/s3/multipart/${uploadId}`, {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  } catch (error) {
    throw error;
  }
};

export const getMultipartSignedUrls = async (uploadId: string, key: string, partNumbers: number[]) => {
  try {
    const params = new URLSearchParams({
      key: key,
      partNumbers: partNumbers.join(','),
    });
    return fetch(`/api/storage/s3/multipart/${uploadId}/batch?${params.toString()}`, {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  } catch (error) {
    throw error;
  }
};

export const completeMultipart = async (uploadId: string, key: string, parts: any[]) => {
  try {
    const params = JSON.stringify({
      key: key,
      parts: parts,
    });
    return fetch(`/api/storage/s3/multipart/${uploadId}/complete`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'X-CSRF-Token': getCsrfToken(),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: params,
    });
  } catch (error) {
    throw error;
  }
};

export const uploadFileInChunks = async (
  signedUrls: any,
  headers: any,
  file: File,
  partCount: number,
  progressCallback?: (event: ProgressEvent) => void,
) => {
  try {
    let chunkSize = FILE_UPLOAD_CHUNK_SIZE_IN_BYTES;
    // Default chunk size is 1MB
    let start = 0;

    // Iterate over the file in chunks and upload each chunk
    let partNumber = 1;
    let parts = [];

    while (start < file.size) {
      let end = start + chunkSize;
      const chunk = file.slice(start, end);
      import.meta.env.DEV && (await sleep(1500));

      // const contentRange = `bytes ${start}-${end - 1}/${file.size}`
      const signedUrl = signedUrls[`${partNumber}`];
      // Await ensures each chunk is uploaded before the next one starts
      const response = await fetch(signedUrl, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: Object.assign({}, headers, {
          // "Content-Range": contentRange,
          'Content-Length': chunk.size,
          'Transfer-Encoding': 'chunked',
        }),
        body: chunk,
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status} during chunk ${partNumber} upload.`);
      }
      parts.push({ PartNumber: `${partNumber}`, ETag: response.headers.get('Etag') });

      partNumber++;

      if (progressCallback) {
        progressCallback(
          new ProgressEvent('progress', { lengthComputable: true, loaded: partNumber, total: partCount }),
        ); //update in format required
      }

      start = end;
    }
    import.meta.env.dev && console.log('[DEV] chunk count matches', partNumber - 1 == partCount);

    return parts;
  } catch (error) {
    throw error;
  }
};

export const persistFileUpload = async (
  persistFileUploadAction: string,
  persistFileUploadUrl: string,
  updatePayload: any,
  filePayload: any,
) => {
  //takes an S3 file and persists it based on the setting path
  //conversts file id from cache/key to model/modelId/key
  //persiste model and modelId as part of the metadata
  //fileKey specifies the key identifier inside form io for the owner of this file

  //multifile would do a loop of these responses
  try {
    const response = await fetch(persistFileUploadUrl, {
      method: persistFileUploadAction,
      headers: {
        'X-CSRF-Token': getCsrfToken(),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(updatePayload),
    });
    if (!response.ok) {
      throw new Error(`Could not persist the file from cache to storage.`);
    }
    const result = await response.json();
    //assumes one file returns per update
    const fileDetails = result?.data?.[0];
    return {
      ...filePayload,
      ...{ storage: 's3custom' },
      ...(fileDetails ? { id: fileDetails.id, modelId: fileDetails.modelId, model: fileDetails.model } : {}),
    };
  } catch (error) {
    throw error;
  }
};
