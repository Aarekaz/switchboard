import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Bot } from './bot.js';
import type { PlatformAdapter } from '../adapter/interface.js';
import type { UnifiedMessage } from '../types/message.js';
import type { UnifiedEvent } from '../types/event.js';
import { ok, err } from '../types/result.js';
import { StreamError } from '../utils/errors.js';

/**
 * Build a minimal mock adapter wired for streaming tests:
 * - sendMessage records calls and returns a UnifiedMessage
 * - editMessage records every edit with its full text, resolvable on demand
 *   so tests can assert edit ordering/coalescing against the faked clock
 */
function makeMockAdapter(overrides?: Partial<PlatformAdapter>): {
  adapter: PlatformAdapter;
  sendMessage: ReturnType<typeof vi.fn>;
  editMessage: ReturnType<typeof vi.fn>;
  editCalls: string[];
} {
  const editCalls: string[] = [];
  const sendMessage = vi.fn(async (channelId: string, text: string) => {
    const message: UnifiedMessage = {
      id: 'msg-1',
      channelId,
      userId: 'bot',
      text,
      timestamp: new Date(0),
      platform: 'discord',
      _raw: {},
    };
    return ok(message);
  });
  const editMessage = vi.fn(async (_ref: unknown, newText: string) => {
    editCalls.push(newText);
    const message: UnifiedMessage = {
      id: 'msg-1',
      channelId: 'channel-1',
      userId: 'bot',
      text: newText,
      timestamp: new Date(0),
      platform: 'discord',
      _raw: {},
    };
    return ok(message);
  });

  const adapter: PlatformAdapter = {
    name: 'mock-adapter',
    platform: 'discord',
    connect: vi.fn(async () => {}),
    disconnect: vi.fn(async () => {}),
    isConnected: vi.fn(() => true),
    sendMessage,
    editMessage,
    deleteMessage: vi.fn(async () => ok(undefined)),
    addReaction: vi.fn(async () => ok(undefined)),
    removeReaction: vi.fn(async () => ok(undefined)),
    createThread: vi.fn(async () => {
      const message: UnifiedMessage = {
        id: 'thread-msg-1',
        channelId: 'channel-1',
        userId: 'bot',
        text: '...',
        timestamp: new Date(0),
        platform: 'discord',
        _raw: {},
      };
      return ok(message);
    }),
    uploadFile: vi.fn(async () => err(new Error('not implemented'))),
    onEvent: vi.fn((_handler: (event: UnifiedEvent) => void) => () => {}),
    getChannels: vi.fn(async () => ok([])),
    getUsers: vi.fn(async () => ok([])),
    normalizeMessage: vi.fn(),
    normalizeEvent: vi.fn(() => null),
    ...overrides,
  };

  return { adapter, sendMessage, editMessage, editCalls };
}

/**
 * AsyncIterable producer driven by a manual queue — lets tests release chunks
 * one at a time between advances of the fake timer.
 */
function makeManualStream(): {
  stream: AsyncIterable<string>;
  push: (chunk: string) => void;
  end: () => void;
  fail: (error: Error) => void;
} {
  const chunks: string[] = [];
  let ended = false;
  let failure: Error | null = null;
  const waiters: Array<() => void> = [];

  const wake = () => {
    const w = waiters.splice(0);
    w.forEach((fn) => fn());
  };

  const stream: AsyncIterable<string> = {
    async *[Symbol.asyncIterator]() {
      for (;;) {
        if (chunks.length) {
          yield chunks.shift()!;
          continue;
        }
        if (failure) throw failure;
        if (ended) return;
        await new Promise<void>((resolve) => waiters.push(resolve));
      }
    },
  };

  return {
    stream,
    push: (chunk: string) => {
      chunks.push(chunk);
      wake();
    },
    end: () => {
      ended = true;
      wake();
    },
    fail: (error: Error) => {
      failure = error;
      wake();
    },
  };
}

describe('Bot streaming', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('posts placeholder then edits with final text on short stream', async () => {
    const { adapter, sendMessage, editMessage } = makeMockAdapter();
    const bot = new Bot(adapter, 'discord', {});

    async function* stream() {
      yield 'Hello';
      yield ', world';
    }

    const result = await bot.sendMessage('channel-1', stream());

    expect(sendMessage).toHaveBeenCalledWith('channel-1', '...', undefined);
    expect(editMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'msg-1' }),
      'Hello, world'
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.text).toBe('Hello, world');
  });

  it('honors updateIntervalMs — coalesces multiple chunks into one edit', async () => {
    const { adapter, editCalls } = makeMockAdapter();
    const bot = new Bot(adapter, 'discord', {});
    const { stream, push, end } = makeManualStream();

    const promise = bot.sendMessage('channel-1', stream, {
      stream: { updateIntervalMs: 500 },
    });

    // Let the initial send resolve and the interval timer arm.
    await vi.advanceTimersByTimeAsync(0);

    // Three chunks land before the first tick — should coalesce to one edit.
    push('a');
    push('b');
    push('c');
    await vi.advanceTimersByTimeAsync(500);

    expect(editCalls).toEqual(['abc']);

    end();
    await vi.advanceTimersByTimeAsync(0);
    await promise;

    // Final flush should not produce a duplicate edit when nothing new arrived.
    expect(editCalls).toEqual(['abc']);
  });

  it('emits multiple edits when stream produces across several intervals', async () => {
    const { adapter, editCalls } = makeMockAdapter();
    const bot = new Bot(adapter, 'discord', {});
    const { stream, push, end } = makeManualStream();

    const promise = bot.sendMessage('channel-1', stream, {
      stream: { updateIntervalMs: 500 },
    });
    await vi.advanceTimersByTimeAsync(0);

    push('one');
    await vi.advanceTimersByTimeAsync(500);
    push(' two');
    await vi.advanceTimersByTimeAsync(500);
    push(' three');
    end();
    await vi.advanceTimersByTimeAsync(500);
    await promise;

    expect(editCalls[0]).toBe('one');
    expect(editCalls[editCalls.length - 1]).toBe('one two three');
  });

  it('invokes onChunk with accumulated text after every chunk', async () => {
    const { adapter } = makeMockAdapter();
    const bot = new Bot(adapter, 'discord', {});
    const onChunk = vi.fn();

    async function* stream() {
      yield 'Hi';
      yield ' there';
    }

    await bot.sendMessage('channel-1', stream(), {
      stream: { onChunk },
    });

    expect(onChunk).toHaveBeenCalledTimes(2);
    expect(onChunk).toHaveBeenNthCalledWith(1, 'Hi');
    expect(onChunk).toHaveBeenNthCalledWith(2, 'Hi there');
  });

  it('supports custom placeholder', async () => {
    const { adapter, sendMessage } = makeMockAdapter();
    const bot = new Bot(adapter, 'discord', {});

    async function* stream() {
      yield 'done';
    }

    await bot.sendMessage('channel-1', stream(), {
      stream: { placeholder: 'Thinking…' },
    });

    expect(sendMessage).toHaveBeenCalledWith(
      'channel-1',
      'Thinking…',
      expect.any(Object)
    );
  });

  it('returns StreamError with partialText when stream throws mid-flight', async () => {
    const { adapter, editMessage } = makeMockAdapter();
    const bot = new Bot(adapter, 'discord', {});
    const { stream, push, fail } = makeManualStream();

    const promise = bot.sendMessage('channel-1', stream, {
      stream: { updateIntervalMs: 500 },
    });
    await vi.advanceTimersByTimeAsync(0);

    push('partial');
    fail(new Error('upstream died'));
    // Give the reader loop a chance to observe the failure and run the catch/flush.
    await vi.advanceTimersByTimeAsync(500);
    const result = await promise;

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(StreamError);
      expect((result.error as StreamError).partialText).toBe('partial');
    }
    // Even on failure the last partial text is posted so the user isn't left
    // staring at the placeholder.
    expect(editMessage).toHaveBeenCalledWith(
      expect.any(Object),
      'partial'
    );
  });

  it('returns initial error without attempting edits when placeholder send fails', async () => {
    const boom = new Error('boom');
    const { adapter, editMessage } = makeMockAdapter({
      sendMessage: vi.fn(async () => err(boom)),
    });
    const bot = new Bot(adapter, 'discord', {});

    async function* stream() {
      yield 'never posted';
    }

    const result = await bot.sendMessage('channel-1', stream());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(boom);
    expect(editMessage).not.toHaveBeenCalled();
  });

  it('continues flushing when a mid-stream edit fails (transient error recovery)', async () => {
    let editAttempt = 0;
    const editMessage = vi.fn(async (_ref: unknown, text: string) => {
      editAttempt++;
      if (editAttempt === 1) return err(new Error('rate limited'));
      return ok({
        id: 'msg-1',
        channelId: 'channel-1',
        userId: 'bot',
        text,
        timestamp: new Date(0),
        platform: 'discord' as const,
        _raw: {},
      });
    });

    const { adapter } = makeMockAdapter({ editMessage });
    const bot = new Bot(adapter, 'discord', {});
    const { stream, push, end } = makeManualStream();

    const promise = bot.sendMessage('channel-1', stream, {
      stream: { updateIntervalMs: 500 },
    });
    await vi.advanceTimersByTimeAsync(0);

    push('first');
    await vi.advanceTimersByTimeAsync(500);
    push(' second');
    end();
    await vi.advanceTimersByTimeAsync(500);
    const result = await promise;

    expect(editAttempt).toBeGreaterThanOrEqual(2);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.text).toBe('first second');
  });

  it('accepts ReadableStream<string> input', async () => {
    const { adapter, editMessage } = makeMockAdapter();
    const bot = new Bot(adapter, 'discord', {});

    const readable = new ReadableStream<string>({
      start(controller) {
        controller.enqueue('Rx');
        controller.enqueue(' chunk');
        controller.close();
      },
    });

    const result = await bot.sendMessage('channel-1', readable);

    expect(result.ok).toBe(true);
    expect(editMessage).toHaveBeenLastCalledWith(
      expect.any(Object),
      'Rx chunk'
    );
  });

  it('reply() streams into the same thread as the source message', async () => {
    const { adapter, sendMessage } = makeMockAdapter();
    const bot = new Bot(adapter, 'discord', {});

    const incoming: UnifiedMessage = {
      id: 'user-msg-1',
      channelId: 'channel-1',
      userId: 'user-1',
      text: 'hello',
      timestamp: new Date(0),
      platform: 'discord',
      _raw: {},
    };

    async function* stream() {
      yield 'reply';
    }

    await bot.reply(incoming, stream());

    expect(sendMessage).toHaveBeenCalledWith(
      'channel-1',
      '...',
      expect.objectContaining({ threadId: 'user-msg-1' })
    );
  });

  it('leaves plain string sends untouched (no streaming code path)', async () => {
    const { adapter, sendMessage, editMessage } = makeMockAdapter();
    const bot = new Bot(adapter, 'discord', {});

    await bot.sendMessage('channel-1', 'plain');

    expect(sendMessage).toHaveBeenCalledWith('channel-1', 'plain', undefined);
    expect(editMessage).not.toHaveBeenCalled();
  });
});
