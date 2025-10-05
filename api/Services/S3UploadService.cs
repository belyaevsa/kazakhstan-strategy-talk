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
    private readonly ILogger<S3UploadService> _logger;

    public S3UploadService(IAmazonS3 s3Client, IConfiguration configuration, ILogger<S3UploadService> logger)
    {
        _s3Client = s3Client;
        _logger = logger;
        _bucketName = configuration["AWS_S3_BUCKET_NAME"]
            ?? throw new InvalidOperationException("AWS_S3_BUCKET_NAME is not configured");

        _logger.LogInformation("S3UploadService initialized. Bucket: {BucketName}", _bucketName);
    }

    public async Task<string> UploadFileAsync(Stream fileStream, string fileName, string contentType)
    {
        _logger.LogInformation("Upload started. FileName: {FileName}, ContentType: {ContentType}, Size: {Size} bytes",
            fileName, contentType, fileStream.Length);

        try
        {
            // Generate unique file name to prevent collisions
            var uniqueFileName = $"{Guid.NewGuid()}-{fileName}";
            var key = $"images/{uniqueFileName}";

            _logger.LogDebug("Generated unique file name. Key: {Key}", key);

            var transferUtility = new TransferUtility(_s3Client);

            var uploadRequest = new TransferUtilityUploadRequest
            {
                InputStream = fileStream,
                Key = key,
                BucketName = _bucketName,
                ContentType = contentType,
                CannedACL = S3CannedACL.PublicRead // Make the file publicly accessible
            };

            _logger.LogInformation("Uploading to S3. Bucket: {Bucket}, Key: {Key}",
                _bucketName, key);

            await transferUtility.UploadAsync(uploadRequest);

            // Return the public URL for Yandex Object Storage
            var publicUrl = $"https://storage.yandexcloud.net/{_bucketName}/{key}";

            _logger.LogInformation("Upload successful. URL: {Url}", publicUrl);

            return publicUrl;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Upload failed. FileName: {FileName}, ContentType: {ContentType}",
                fileName, contentType);
            throw;
        }
    }
}
