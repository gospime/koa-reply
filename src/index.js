const debug = require('debug')('@gospime/koa-reply');

/*
type BoomifiedError = Error & {
  isBoom?: boolean,
  status?: number,
  statusCode: number,
  message?: string,
  data?: Object,
  output?: {
    statusCode?: number,
    payload?: {
      message?: string
    }
  }
};
*/

const parseError = (error/*: BoomifiedError*/ = null, context) => {
  if (typeof context !== 'object') throw new TypeError('Invalid context');

  if (error) {
    debug('Catched error: ', error);

    if (typeof context.log === 'object' && typeof context.log.error === 'function') {
      context.log.error(error);
    } else {
      context.error(error);
    }
  }

  const result = {};

  if (error instanceof Error) {
    if (error.isBoom) {
      result.code = error.output.statusCode || error.statusCode;
      result.message = error.output.payload.message || error.message;
      result.data = error.data;
    } else {
      result.code = error.status || error.statusCode || 500;
      result.message = error.message || 'An internal server error has occured';
    }
  }

  return result;
};

module.exports = async (context, next) => {
  if (typeof context !== 'object') throw new TypeError('Invalid context');

  context.reply = ({ error, statusCode, message, payload }) => {
    if (context.headerSent) return next(error);

    if (error) {
      const errorData = parseError(error, context);
      if (errorData && typeof errorData === 'object') {
        if (errorData.code) statusCode = errorData.code;
        if (errorData.message) message = errorData.message;
        if (errorData.data) payload = errorData.data;
      }
    }

    statusCode = parseInt(statusCode) || 200;

    if (!message || typeof message !== 'string') {
      message = 'Successfully completed';
    }

    if (!payload || typeof payload !== 'object') {
      payload = null;
    }

    const result = { statusCode, message, payload };

    debug('Result:', result);

    if (result.statusCode !== context.status) {
      context.status = result.statusCode;
    }

    // $FlowFixMe
    context.body = result;
  };

  await next();
};
