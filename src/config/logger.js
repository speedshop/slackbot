const pino = require('pino');

// Configure logger options
const loggerOptions = {
  level: process.env.LOG_LEVEL || 'info',
  timestamp: true,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  }
};

// Add pretty printing in development mode
if (process.env.NODE_ENV === 'development') {
  loggerOptions.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
      messageFormat: '{if source} [{source}] {end}{if message}{message}{end}{if msg}{msg}{end}'
    }
  };
} else {
  loggerOptions.transport = {
    target: 'pino/file',
    options: { destination: 1 } // stdout
  };
}

const logger = pino(loggerOptions);

module.exports = logger;
