import addCacheHeaders from '../../../src/server/plugins/addCacheHeaders'

test('adds cache headers', () => {
  const request = {
    method: 'get'
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

  addCacheHeaders(fastify, null, done)

  expect(fastify.addHook).toHaveBeenCalled();
  expect(done).toHaveBeenCalled();
  expect(reply.header).toHaveBeenCalledTimes(2)
  expect(reply.header).toHaveBeenCalledWith('Cache-Control', 'no-store')
  expect(reply.header).toHaveBeenCalledWith('Pragma', 'no-cache')
})

test('does not add cache headers', () => {
  const request = {
    method: 'post'
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

  addCacheHeaders(fastify, null, done)

  expect(fastify.addHook).toHaveBeenCalled();
  expect(done).toHaveBeenCalled();
  expect(reply.header).not.toHaveBeenCalled()
})