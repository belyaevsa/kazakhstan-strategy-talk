# Yandex Object Storage - Quick Setup

## Step-by-Step Setup

### 1. Yandex Cloud Console

1. Go to https://console.cloud.yandex.ru
2. Log in or create account
3. Create or select a folder (project)

### 2. Create Service Account

1. Navigate to **Service Accounts**
2. Click **Create service account**
3. Name: `kazakhstan-strategy-storage` 
4. Add role: `storage.editor`
5. Click **Create**

### 3. Generate Static Keys

1. Open the service account you just created
2. Click **Create new key** → **Create access key**
3. **Save both keys immediately**:
   - Access Key ID (like: `YCAJExxx...`)
   - Secret Key (like: `YCMxxx...`)

### 4. Create Storage Bucket

1. Navigate to **Object Storage** → **Buckets**
2. Click **Create bucket**
3. Settings:
   - Name: `kazakhstan-strategy-images` (must be unique)
   - Access: **Public** ✅
   - Storage class: **Standard**
   - Max size: Set as needed or leave unlimited
4. Click **Create**

### 5. Configure Public Access

1. Open your bucket
2. Go to **Settings** → **Access**
3. Enable **Public access** for reading
4. Or use bucket policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::kazakhstan-strategy-images/*"
    }
  ]
}
```

### 6. Update .env File

Edit `api/.env`:

```env
AWS_ACCESS_KEY_ID=YCAJExxxxxxxxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=YCMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_REGION=ru-central1
AWS_S3_BUCKET_NAME=kazakhstan-strategy-images
AWS_S3_SERVICE_URL=https://storage.yandexcloud.net
```

### 7. Test

```bash
cd api
dotnet run
```

Then in your app:
1. Enter edit mode
2. Add Image paragraph
3. Drag & drop an image or paste from clipboard
4. Image should upload and URL will appear

## Troubleshooting

### "Access Denied" error
- Check service account has `storage.editor` role
- Verify static keys are correct
- Ensure bucket is set to public access

### "Bucket not found"
- Verify bucket name is correct in `.env`
- Check bucket exists in Yandex console

### Images not loading in browser
- Check bucket public access is enabled
- Verify URL format: `https://storage.yandexcloud.net/{bucket}/{key}`
- Check CORS settings if loading from different domain

## URL Format

Uploaded images will have URLs like:
```
https://storage.yandexcloud.net/kazakhstan-strategy-images/images/uuid-filename.jpg
```

## Optional: Custom Domain

To use custom domain (e.g., `images.yoursite.kz`):

1. In bucket settings → **Website**
2. Enable static website hosting
3. Configure your domain DNS:
   ```
   CNAME images.yoursite.kz → storage.yandexcloud.net
   ```
4. Update `S3UploadService.cs` to return custom domain URL

## Costs

- First 1 GB: **Free**
- Storage: ~₽1.30/GB/month (~$0.014)
- Operations: Very low (₽0.003-0.006 per 1000 requests)

For this project with moderate usage, expect **< ₽100/month** (~$1)
