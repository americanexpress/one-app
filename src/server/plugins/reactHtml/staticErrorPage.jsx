import { createTimeoutFetch } from '@americanexpress/fetch-enhancers';

let errorPage;

/**
 * Sets the global error page
 * @param {string} fallbackUrl error page url
 * @returns error page
 */
export async function setErrorPage(fallbackUrl) {
  try {
    const timeoutFetch = createTimeoutFetch(6e3)(fetch);
    const response = await timeoutFetch(fallbackUrl);
    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');

    // Warn if status is not a 200 and return errorPage
    if (response.status !== 200) {
      console.warn('Failed to fetch custom error page with status:', response.status);
      return errorPage;
    }
    // Warn if the Content-Type is not text/html
    if (!contentType.includes('text/html')) {
      console.warn('[appConfig/errorPageUrl] Content-Type was not of type text/html and may not render correctly');
    }
    // Warn if the content length is over 244kb
    if (contentLength > 250e3) {
      console.warn('[appConfig/errorPageUrl] Content-Length is over 244Kb and may have an impact on performance');
    }
    // Read the response as text.
    errorPage = await response.text();
  } catch (e) {
    // Warn if the URL cannot be fetched
    console.warn('Could not fetch the URL', e);
  }

  return errorPage;
}

/**
 * Static Error Page handler
 * @param {import('fastify').FastifyRequest} request Fastify Request object
 * @param {import('fastify').FastifyReply} reply Fastify Reply object
 */
export default async function staticErrorPage(request, reply) {
  const contentType = request.headers['content-type'];
  const statusCode = reply.statusCode || 500;

  if (errorPage) {
    reply.code(statusCode).send(errorPage);
  } else {
    let message = 'Sorry, we are unable to load this page at this time. Please try again later.';

    if (reply.statusCode >= 400 && reply.statusCode < 500 && reply.statusCode !== 404) {
      // issue is with the request, retrying won't change the server response
      message = 'Sorry, we are unable to load this page at this time.';
    }

    if (contentType && contentType.includes('application/json')) {
      reply.type(contentType).code(statusCode).send({
        message,
      });
    } else {
      reply.type('text/html').code(statusCode).send(`<!DOCTYPE html>
      <html>
        <head>
          <title>One App</title>
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta name="application-name" content="one-app">
        </head>
        <body style="background-color: #F0F0F0">
          <div id="root">
            <div>
              <div style="width: 70%; background-color: white; margin: 4% auto;">
                <h2 style="display: flex; justify-content: center; padding: 40px 15px 0px;">Loading Error</h2>
                <p style="display: flex; justify-content: center; padding: 10px 15px 40px;">
                  ${message}
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>`);
    }
  }
}
