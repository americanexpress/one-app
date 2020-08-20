// https://expressjs.com/en/guide/error-handling.html
import { renderStaticErrorPage } from './sendHtml';

// eslint-disable-next-line max-params
const serverError = (err, req, res, next) => {
  const { method, url } = req;
  const correlationId = req.headers && req.headers['correlation-id'];

  const headersSent = !!res.headersSent;

  console.error(err, `express application error: method ${method}, url "${url}", correlationId "${correlationId}", headersSent: ${headersSent}`);

  if (headersSent) {
    // don't try changing the headers at this point
    return next(err);
  }

  if (err.name === 'URIError') {
    // invalid URL given to express, unable to parse
    res.status(400);
  } else {
    res.status(500);
  }

  return renderStaticErrorPage(res);
};

module.exports = serverError;
