const fs = require('fs').promises;
const logger = require('../config/logger');

class UserTracker {
  constructor(filename) {
    this.filename = filename;
  }

  async initialize() {
    try {
      await fs.access(this.filename);
    } catch {
      await fs.writeFile(this.filename, '');
    }
  }

  async hasBeenProcessed(userId) {
    try {
      const content = await fs.readFile(this.filename, 'utf8');
      return content.split('\n').includes(userId);
    } catch (error) {
      logger.error('Error checking processed user:', error);
      return false;
    }
  }

  async markAsProcessed(userId) {
    try {
      await fs.appendFile(this.filename, `${userId}\n`);
      return true;
    } catch (error) {
      logger.error('Error marking user as processed:', error);
      return false;
    }
  }
}

module.exports = UserTracker;
