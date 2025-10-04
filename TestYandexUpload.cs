using Amazon.S3;
using Amazon.S3.Transfer;
using Amazon.Runtime;
using System;
using System.IO;
using System.Threading.Tasks;

class TestYandexUpload
{
    static async Task Main()
    {
        var accessKey = "YCAJE0n2aCY-pyAT9HTKFQhdb";
        var secretKey = "YCMVTnJ2inC4DBjwHFcNQCT-5YtQFtp";
        var bucketName = "kaz-it-strategy";
        var serviceUrl = "https://storage.yandexcloud.net";

        Console.WriteLine("🧪 Testing Yandex Object Storage connection...\n");
        Console.WriteLine($"Bucket: {bucketName}");
        Console.WriteLine($"Endpoint: {serviceUrl}\n");

        var credentials = new BasicAWSCredentials(accessKey, secretKey);
        var config = new AmazonS3Config
        {
            ServiceURL = serviceUrl,
            ForcePathStyle = true
        };

        using var s3Client = new AmazonS3Client(credentials, config);

        // Test 1: List buckets
        Console.WriteLine("📋 Test 1: Listing buckets...");
        try
        {
            var bucketsResponse = await s3Client.ListBucketsAsync();
            Console.WriteLine($"✅ Success! Found {bucketsResponse.Buckets.Count} buckets");
            foreach (var bucket in bucketsResponse.Buckets)
            {
                Console.WriteLine($"   - {bucket.BucketName}");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Failed: {ex.Message}");
        }

        // Test 2: Upload file
        Console.WriteLine("\n📤 Test 2: Uploading test file...");
        try
        {
            // Create a small test file
            var testContent = "Test upload from C# - " + DateTime.UtcNow;
            var fileName = $"test-{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}.txt";
            var memoryStream = new MemoryStream(System.Text.Encoding.UTF8.GetBytes(testContent));

            var transferUtility = new TransferUtility(s3Client);
            var uploadRequest = new TransferUtilityUploadRequest
            {
                InputStream = memoryStream,
                Key = $"images/{fileName}",
                BucketName = bucketName,
                ContentType = "text/plain",
                CannedACL = S3CannedACL.PublicRead
            };

            await transferUtility.UploadAsync(uploadRequest);

            var publicUrl = $"https://storage.yandexcloud.net/{bucketName}/images/{fileName}";
            Console.WriteLine($"✅ Upload successful!");
            Console.WriteLine($"📎 URL: {publicUrl}");
            Console.WriteLine($"\n🎉 Yandex credentials are working correctly!");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Upload failed: {ex.Message}");
            Console.WriteLine($"\n🔍 Details: {ex}");
        }
    }
}
