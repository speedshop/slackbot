const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

class ExportUrlService {
  constructor({
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    objectKey = 'railsperf-export-latest.zip',
    region = 'auto',
    expiresInSeconds = 604800
  }) {
    this.bucket = bucket;
    this.objectKey = objectKey;
    this.expiresInSeconds = expiresInSeconds;

    this.client = new S3Client({
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      region,
      forcePathStyle: true,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });
  }

  async generateDownloadUrl() {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: this.objectKey
    });

    return getSignedUrl(this.client, command, { expiresIn: this.expiresInSeconds });
  }
}

module.exports = ExportUrlService;
