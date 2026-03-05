import { WinstonModuleOptions } from 'nest-winston';
import { format, transports } from 'winston';

const { combine, timestamp, printf, colorize } = format;

const filterNestExceptions = format((info) => {
  if (info.context === 'ExceptionsHandler') return false;
  return info;
});

const buildLogFormat = (withColor = false) => {
  const logFormat = printf(({ level, message, timestamp, context }) => {
    const ctx = context ? `[${context}] ` : '';
    return `${timestamp} [${level}] ${ctx}${message}`;
  });

  return withColor
    ? combine(
        filterNestExceptions(),
        colorize({ all: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat,
      )
    : combine(
        filterNestExceptions(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat,
      );
};

export const loggerConfig: WinstonModuleOptions = {
  transports: [
    new transports.Console({
      format: buildLogFormat(true),
    }),
    new transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: buildLogFormat(),
    }),
    new transports.File({
      filename: 'logs/combined.log',
      format: buildLogFormat(),
    }),
  ],
};
