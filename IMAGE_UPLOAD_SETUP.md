# Image Upload Setup Guide

## Overview

The application now supports direct image upload to Yandex Object Storage with drag-drop and paste-from-clipboard functionality.

## Configuration

### 1. Yandex Object Storage Setup

1. **Create Service Account** (in Yandex Cloud Console)
   - Go to https://console.cloud.yandex.ru
   - Navigate to Service Accounts
   - Create new service account
   - Assign role: `storage.editor` or `storage.uploader`

2. **Create Static Access Keys**
   - In your service account, create static access keys
   - Save Access Key ID and Secret Access Key

3. **Create Storage Bucket**
   - Go to Object Storage → Buckets
   - Click "Create bucket"
   - Choose bucket name (e.g., `kazakhstan-strategy-images`)
   - Set access: **Public** (for public read)
   - Click Create

4. **Set Bucket Access (Public Read)**
   - Open your bucket
   - Go to "Access Control List (ACL)" or "Bucket Policy"
   - Add public read access for objects

### 2. Environment Variables

Update `api/.env` with your Yandex credentials:

```env
# Yandex Object Storage Configuration
AWS_ACCESS_KEY_ID=your-yandex-access-key-id
AWS_SECRET_ACCESS_KEY=your-yandex-secret-access-key
AWS_REGION=ru-central1
AWS_S3_BUCKET_NAME=kazakhstan-strategy-images
AWS_S3_SERVICE_URL=https://storage.yandexcloud.net
```

**Important Notes:**
- Use the static access keys from your Yandex service account
- Region is typically `ru-central1` (Moscow)
- Service URL must be `https://storage.yandexcloud.net`

### 3. Database Migration

The `Caption` field has already been added via migration. If you need to run it manually:

```bash
cd api
dotnet ef database update
```

## Features

### 1. Drag & Drop Upload
- In edit mode, create an "Image" paragraph
- Drag and drop any image file into the upload zone
- Supports: PNG, JPG, GIF, WebP, SVG (max 10MB)

### 2. Paste from Clipboard
- Copy any image (screenshot, image from web, etc.)
- While in an Image paragraph, press `Ctrl/Cmd + V`
- Image automatically uploads and URL is inserted

### 3. Manual URL Entry
- After upload, you can manually edit the URL if needed
- Click the X button to clear and upload a different image

### 4. Image Caption
- Optional caption/subtitle field appears after upload
- Displayed below the image link in view mode

## Usage

1. **Create Image Paragraph**
   - Enter edit mode
   - Add new paragraph
   - Change type to "Image"

2. **Upload Image (3 ways)**
   - **Drag & Drop**: Drag image file into the upload zone
   - **Click Upload**: Click the upload zone to select a file
   - **Paste**: Press Ctrl/Cmd+V with an image in clipboard

3. **Add Caption** (optional)
   - After upload, enter caption in the text field
   - Caption appears below image link in view mode

4. **View Mode**
   - Displays as a clickable "View Image" link
   - Caption shown below (if provided)

## File Restrictions

- **Max size**: 10MB
- **Allowed formats**: JPG, JPEG, PNG, GIF, WebP, SVG
- **Content type**: Must be `image/*`

## API Endpoint

```
POST /api/upload/image
Authorization: Bearer {token}
Content-Type: multipart/form-data

Body:
- file: (binary)

Response:
{
  "url": "https://your-bucket.s3.amazonaws.com/images/{uuid}-{filename}"
}
```

## Security

- Upload requires Editor or Admin role
- File type validation on both client and server
- File size limit enforced
- Unique filenames (UUID prefix) prevent collisions
- Public read access for serving images

## Troubleshooting

### Upload fails with "S3 upload service is not configured"
- Check that AWS credentials are set in `.env`
- Restart the API after updating `.env`

### Images not loading
- Verify bucket has public read policy
- Check CORS settings on S3/R2
- Ensure correct URL format in response

### Paste not working
- Make sure you're in an Image paragraph
- Check browser permissions for clipboard access
- Try copying image again

## Yandex Object Storage Pricing

**Free Tier** (for testing):
- 1 GB storage free
- After: ₽1.30/GB/month (~$0.014/GB)

**Advantages:**
- S3-compatible API (uses AWS SDK)
- Data stored in Russia (good for regional compliance)
- Competitive pricing
- Built-in CDN available

**Optimization Tips:**
- Enable bucket lifecycle policies to delete old images
- Use Yandex CDN for better delivery performance
- Consider setting up CORS for direct uploads from browser
