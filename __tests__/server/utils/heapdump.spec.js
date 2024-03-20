/*
 * Copyright 2019 American Express Travel Related Services Company, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

import util from 'node:util';
import fs from 'node:fs';
import v8 from 'node:v8';
import { Writable, Readable } from 'node:stream';

const sleep = (ms) => new Promise((res) => { setTimeout(res, ms); });

jest.spyOn(process, 'on').mockImplementation(() => {});
jest.spyOn(Date, 'now').mockImplementation(() => 1525145998246);
jest.spyOn(console, 'warn').mockImplementation(util.format);
jest.spyOn(console, 'error').mockImplementation(util.format);

const mockHeapSnapshotContents = { lots: 'of keys', and: ['many', 'many', 'values'] };
jest.spyOn(v8, 'getHeapSnapshot').mockImplementation(() => {
  const heapSnapshot = Buffer.from(JSON.stringify(mockHeapSnapshotContents));
  let pointer = 0;
  const readable = new Readable({
    highWaterMark: 20,
    read(size) {
      const start = pointer;
      const end = pointer + size;
      const chunk = heapSnapshot.slice(start, end);
      this.push(chunk);
      pointer = end;
      if (pointer >= heapSnapshot.length) {
        this.push(null);
      }
    },
  });
  return readable;
});

let mockWriteStreamError = null;
jest.spyOn(fs, 'createWriteStream').mockImplementation(() => {
  const mockChunksWritten = [];
  let haveEmittedError = false;
  const writeStream = new Writable({
    write(chunk, encoding, callback) {
      if (mockWriteStreamError) {
        if (!haveEmittedError) {
          haveEmittedError = true;
          setImmediate(() => callback(mockWriteStreamError));
        }
        return;
      }
      mockChunksWritten.push([chunk, encoding]);
      setImmediate(callback);
    },
  });
  writeStream.mockChunksWritten = mockChunksWritten;
  return writeStream;
});

describe('heapdump', () => {
  const { pid } = process;

  function load(error = null) {
    mockWriteStreamError = error;
    jest.isolateModules(() => {
      require('../../../src/server/utils/heapdump');
    });
  }

  function waitForStreamToFinish(stream) {
    return new Promise((res, rej) => {
      stream.on('finish', res);
      stream.on('error', rej);
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('attaches to the SIGUSR2 signal', () => {
    load();
    expect(process.on).toHaveBeenCalledTimes(1);
    expect(process.on).toHaveBeenCalledWith('SIGUSR2', expect.any(Function));
  });

  it('warns if --report-on-signal is set, using SIGUSR2', () => {
    process.execArgv = ['--experimental-report', '--report-on-signal'];
    console.warn.mockClear();
    load();
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn.mock.results[0].value).toMatchInlineSnapshot(
      '"--report-on-signal listens for SIGUSR2 by default, be aware that SIGUSR2 also triggers heapdumps. Use --report-signal to avoid heapdump side-effects https://nodejs.org/api/report.html"'
    );
  });

  describe('on SIGUSR2 signal', () => {
    it('warns about writing a heapdump', async () => {
      load();
      expect(process.on).toHaveBeenCalledTimes(1);
      console.warn.mockClear();
      process.on.mock.calls[0][1]();
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.warn.mock.results[0].value).toBe(
        `about to write a heapdump to /tmp/heapdump-${pid}-1525145998246.heapsnapshot`
      );
      await waitForStreamToFinish(fs.createWriteStream.mock.results[0].value);
      await sleep(20); // also wait for the callback to run
    });

    it('attempts to get a heap snapshot', async () => {
      load();
      expect(process.on).toHaveBeenCalledTimes(1);
      process.on.mock.calls[0][1]();
      await waitForStreamToFinish(fs.createWriteStream.mock.results[0].value);
      await sleep(20);
      expect(v8.getHeapSnapshot).toHaveBeenCalledTimes(1);
      expect(v8.getHeapSnapshot).toHaveBeenCalledWith();
    });

    it('attempts to write a heapdump', async () => {
      load();
      expect(process.on).toHaveBeenCalledTimes(1);
      process.on.mock.calls[0][1]();
      await waitForStreamToFinish(fs.createWriteStream.mock.results[0].value);
      await sleep(20);
      expect(fs.createWriteStream).toHaveBeenCalledTimes(1);
      expect(fs.createWriteStream).toHaveBeenCalledWith(
        `/tmp/heapdump-${pid}-1525145998246.heapsnapshot`
      );
    });

    it('writes the heapdump to the file', async () => {
      expect.assertions(2);
      load();
      expect(process.on).toHaveBeenCalledTimes(1);
      process.on.mock.calls[0][1]();
      const sink = fs.createWriteStream.mock.results[0].value;
      await waitForStreamToFinish(sink);
      await sleep(20);
      expect(
        JSON.parse(sink.mockChunksWritten.map(([chunk]) => chunk.toString('utf8')).join(''))
      ).toEqual(mockHeapSnapshotContents);
    });

    describe('writing the heapdump', () => {
      it('notifies about an error encountered at level error', async () => {
        expect.assertions(4);
        const error = new Error('sample test error');
        load(error);
        expect(process.on).toHaveBeenCalledTimes(1);
        process.on.mock.calls[0][1]();
        console.error.mockClear();
        console.warn.mockClear();
        const sink = fs.createWriteStream.mock.results[0].value;
        await new Promise((res, rej) => {
          sink.on('error', res);
          sink.on('finish', () => rej(new Error('should have rejected')));
        });
        await sleep(20); // also wait for the callback to run
        expect(console.warn).not.toHaveBeenCalled();
        expect(console.error).toHaveBeenCalledTimes(1);
        expect(console.error).toHaveBeenCalledWith('unable to write heapdump', error);
      });

      it('notifies about finishing at level warn', async () => {
        expect.assertions(4);
        load();
        expect(process.on).toHaveBeenCalledTimes(1);
        process.on.mock.calls[0][1]();
        console.error.mockClear();
        console.warn.mockClear();
        await waitForStreamToFinish(fs.createWriteStream.mock.results[0].value);
        await sleep(20); // also wait for the callback to run
        expect(console.error).not.toHaveBeenCalled();
        expect(console.warn).toHaveBeenCalledTimes(1);
        expect(console.warn.mock.results[0].value).toBe(
          `wrote heapdump out to /tmp/heapdump-${pid}-1525145998246.heapsnapshot`
        );
      });
    });
  });
});
