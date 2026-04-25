/**
 * Streaming helpers
 *
 * Used by Bot.sendMessage / reply / createThread to accept live text streams
 * (e.g. AI SDK's `result.textStream`) and translate them into send-then-edit
 * sequences against the underlying PlatformAdapter.
 */

/**
 * Any source of string chunks the streaming API accepts.
 *
 * `ReadableStream<string>` matches AI SDK's `textStream`; `AsyncIterable<string>`
 * matches `for await` loops, custom generators, and `fullStream` wrappers.
 */
export type TextStream = AsyncIterable<string> | ReadableStream<string>;

function isReadableStream<T>(source: unknown): source is ReadableStream<T> {
  return (
    typeof source === 'object' &&
    source !== null &&
    typeof (source as ReadableStream<T>).getReader === 'function'
  );
}

/**
 * Normalize any supported stream source into an `AsyncIterable<string>`.
 *
 * Node 18+ ReadableStreams are already async-iterable, but we don't assume that —
 * we walk the reader explicitly so this works uniformly in older Node, Bun, and
 * Deno runtimes.
 */
export function toAsyncIterable(source: TextStream): AsyncIterable<string> {
  // Check ReadableStream first — some runtimes expose Symbol.asyncIterator on
  // ReadableStream, and when both checks pass we prefer the explicit reader
  // path so cancellation semantics are predictable.
  if (isReadableStream<string>(source)) {
    const stream = source;
    return (async function* readable() {
      const reader = stream.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) return;
          if (value !== undefined) yield value;
        }
      } finally {
        reader.releaseLock();
      }
    })();
  }

  if (Symbol.asyncIterator in source) {
    return source;
  }

  throw new TypeError(
    'Streamed message content must be AsyncIterable<string> or ReadableStream<string>'
  );
}
