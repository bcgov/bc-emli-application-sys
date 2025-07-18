#!/bin/bash

# Wait for MinIO to be ready
echo "Waiting for MinIO to be ready..."
until mc alias set myminio http://minio:9000 ${MINIO_ROOT_USER} ${MINIO_ROOT_PASSWORD}; do
  echo "MinIO not ready yet, waiting..."
  sleep 2
done

echo "MinIO is ready!"

# Create the uploads bucket if it doesn't exist
if ! mc ls myminio | grep -q uploads; then
  echo "Creating uploads bucket..."
  mc mb myminio/uploads
else
  echo "Uploads bucket already exists"
fi

# Set public read policy for the bucket (for browser access to uploaded files)
echo "Setting public read policy for uploads bucket..."
mc anonymous set public myminio/uploads

echo "MinIO setup complete!"
