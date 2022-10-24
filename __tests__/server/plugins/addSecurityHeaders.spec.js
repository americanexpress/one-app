import addSecurityHeaders from '../../../src/server/plugins/addSecurityHeaders'

beforeEach(() => {
  delete process.env.ONE_REFERRER_POLICY_OVERRIDE
})

test('adds security headers', () => {
  const request = {
    headers: {}
  }
  const reply = {
    header: jest.fn()
  }
  const fastify = {
    addHook: jest.fn(async (_hook, cb) => {
      await cb(request, reply)
    })
  }
  const done = jest.fn();

  addSecurityHeaders(fastify, {}, done)

  expect(fastify.addHook).toHaveBeenCalled();
  expect(done).toHaveBeenCalled();
  expect(reply.header).toHaveBeenCalledTimes(8)
  expect(reply.header).toHaveBeenCalledWith('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  expect(reply.header).toHaveBeenCalledWith('x-dns-prefetch-control', 'off');
  expect(reply.header).toHaveBeenCalledWith('x-download-options', 'noopen');
  expect(reply.header).toHaveBeenCalledWith('x-permitted-cross-domain-policies', 'none');
  expect(reply.header).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
  expect(reply.header).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
  expect(reply.header).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
  expect(reply.header).toHaveBeenCalledWith('Referrer-Policy', 'same-origin');
})

test('adds security headers with custom referrer policy', () => {
  process.env.ONE_REFERRER_POLICY_OVERRIDE = 'origin-when-cross-origin';

  const request = {
    headers: {}
  }
  const reply = {
    header: jest.fn()
  }
  const fastify = {
    addHook: jest.fn(async (_hook, cb) => {
      await cb(request, reply)
    })
  }
  const done = jest.fn();

  addSecurityHeaders(fastify, {}, done)

  expect(fastify.addHook).toHaveBeenCalled();
  expect(done).toHaveBeenCalled();
  expect(reply.header).toHaveBeenCalledTimes(8)
  expect(reply.header).toHaveBeenCalledWith('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  expect(reply.header).toHaveBeenCalledWith('x-dns-prefetch-control', 'off');
  expect(reply.header).toHaveBeenCalledWith('x-download-options', 'noopen');
  expect(reply.header).toHaveBeenCalledWith('x-permitted-cross-domain-policies', 'none');
  expect(reply.header).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
  expect(reply.header).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
  expect(reply.header).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
  expect(reply.header).toHaveBeenCalledWith('Referrer-Policy', 'origin-when-cross-origin');
})

test('adds security headers and omits some based on configuration', () => {
  const request = {
    headers: {},
    url: 'americanexpress.com'
  }
  const reply = {
    header: jest.fn()
  }
  const fastify = {
    addHook: jest.fn(async (_hook, cb) => {
      await cb(request, reply)
    })
  }
  const done = jest.fn();

  addSecurityHeaders(fastify, {
    ignoreRoutes: ['americanexpress.com']
  }, done)

  expect(fastify.addHook).toHaveBeenCalled();
  expect(done).toHaveBeenCalled();
  expect(reply.header).toHaveBeenCalledTimes(8)
  expect(reply.header).toHaveBeenCalledWith('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  expect(reply.header).toHaveBeenCalledWith('x-dns-prefetch-control', 'off');
  expect(reply.header).toHaveBeenCalledWith('x-download-options', 'noopen');
  expect(reply.header).toHaveBeenCalledWith('x-permitted-cross-domain-policies', 'none');
  expect(reply.header).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
  expect(reply.header).toHaveBeenCalledWith('referrer-policy', 'no-referrer');
  expect(reply.header).toHaveBeenCalledWith('x-frame-options', 'SAMEORIGIN');
  expect(reply.header).toHaveBeenCalledWith('x-xss-protection', '0');
})
