using Amazon.S3;
using Amazon.S3.Transfer;

namespace KazakhstanStrategyApi.Services;

public interface IS3UploadService
{
    Task<string> UploadFileAsync(Stream fileStream, string fileName, string contentType);
}

public class S3UploadService : IS3UploadService
{
    private readonly IAmazonS3 _s3Client;
    private readonly string _bucketName;

    public S3UploadService(IAmazonS3 s3Client, IConfiguration configuration)
    {
        _s3Client = s3Client;
        _bucketName = configuration["AWS_S3_BUCKET_NAME"]
            ?? throw new InvalidOperationException("AWS_S3_BUCKET_NAME is not configured");
    }

    public async Task<string> UploadFileAsync(Stream fileStream, string fileName, string contentType)
    {
        // Generate unique file name to prevent collisions
        var uniqueFileName = $"{Guid.NewGuid()}-{fileName}";
        var key = $"images/{uniqueFileName}";

        var transferUtility = new TransferUtility(_s3Client);

        var uploadRequest = new TransferUtilityUploadRequest
        {
            InputStream = fileStream,
            Key = key,
            BucketName = _bucketName,
            ContentType = contentType,
            CannedACL = S3CannedACL.PublicRead // Make the file publicly accessible
        };

        await transferUtility.UploadAsync(uploadRequest);

        // Return the public URL for Yandex Object Storage
        var publicUrl = $"https://storage.yandexcloud.net/{_bucketName}/{key}";

        return publicUrl;
    }
}
