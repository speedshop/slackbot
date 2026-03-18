const { S3Client, HeadObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const logger = require('../config/logger');

class UserTracker {
  constructor({
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    region = 'auto'
  }) {
    this.bucket = bucket;

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

  async initialize() {
    return true;
  }

  markerKey(userId) {
    return `${encodeURIComponent(userId)}.json`;
  }

  async hasBeenProcessed(userId) {
    try {
      await this.client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: this.markerKey(userId)
      }));
      return true;
    } catch (error) {
      const statusCode = error?.$metadata?.httpStatusCode;
      const errorCode = error?.Code || error?.code || error?.name;
      if (statusCode === 404 || errorCode === 'NotFound' || errorCode === 'NoSuchKey') {
        return false;
      }

      logger.error({ error, userId }, 'Error checking processed user marker in R2');
      return false;
    }
  }

  async markAsProcessed(userId) {
    const body = JSON.stringify({
      userId,
      processedAt: new Date().toISOString()
    });

    try {
      await this.client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: this.markerKey(userId),
        Body: body,
        ContentType: 'application/json'
      }));
      return true;
    } catch (error) {
      logger.error({ error, userId }, 'Error writing processed user marker to R2');
      return false;
    }
  }
}

module.exports = UserTracker;
