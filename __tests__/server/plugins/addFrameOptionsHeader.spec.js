import addFrameOptionsHeader from '../../../src/server/plugins/addFrameOptionsHeader'
import { updateCSP } from '../../../src/server/plugins/csp'

beforeEach(() => {
  updateCSP('')
})

describe('empty frame-ancestors', () => {
  test('does not add frame options header', () => {
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

    addFrameOptionsHeader(fastify, null, done)

    expect(fastify.addHook).toHaveBeenCalled();
    expect(done).toHaveBeenCalled();
    expect(reply.header).not.toHaveBeenCalled()
  })
})

describe('no matching domains', () => {
  test('does not add frame options header', () => {
    updateCSP('frame-ancestors americanexpress.com;')
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

    addFrameOptionsHeader(fastify, null, done)

    expect(fastify.addHook).toHaveBeenCalled();
    expect(done).toHaveBeenCalled();
    expect(reply.header).not.toHaveBeenCalled()
  })
})

test('adds frame options header', () => {
  updateCSP('frame-ancestors americanexpress.com;')
  const request = {
    headers: {
      Referer: 'https://americanexpress.com/testing'
    }
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

  addFrameOptionsHeader(fastify, null, done)

  expect(fastify.addHook).toHaveBeenCalled();
  expect(done).toHaveBeenCalled();
  expect(reply.header).toHaveBeenCalledTimes(1)
  expect(reply.header).toHaveBeenCalledWith('X-Frame-Options', "ALLOW-FROM https://americanexpress.com/testing")
})
