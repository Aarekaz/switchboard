# ADR-004: Result Type for Error Handling

**Status**: Accepted

**Date**: 2026-01-12

**Deciders**: Core team

## Context

Chat bot operations can fail for many reasons:
- Network errors
- Invalid permissions
- Rate limiting
- Invalid message IDs
- Platform API errors

We need an error handling strategy that:
1. Makes errors explicit and impossible to ignore
2. Provides good TypeScript autocomplete
3. Doesn't use exceptions for expected failures
4. Works naturally with async/await

### The Problem with Exceptions

```typescript
// Traditional exception-based API
try {
  await bot.sendMessage(channelId, text);
  // Did it succeed? TypeScript doesn't know.
} catch (error) {
  // What type of error? Unknown.
  // Can I retry? Don't know.
}
```

Problems:
- Exceptions are invisible in type signatures
- Forces try/catch boilerplate
- Unclear which operations can fail
- Error types are lost (everything is `unknown`)

## Decision

Use the **Result<T> pattern** inspired by Rust:

```typescript
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: Error };
```

### How It Works

Every fallible operation returns a `Result<T>`:

```typescript
// Instead of throwing
async sendMessage(channelId: string, text: string): Promise<UnifiedMessage>

// We return Result
async sendMessage(channelId: string, text: string): Promise<Result<UnifiedMessage>>
```

### Usage Pattern

```typescript
const result = await bot.sendMessage(channelId, 'Hello!');

if (result.ok) {
  // TypeScript knows: result.value is UnifiedMessage
  console.log('Sent message:', result.value.id);
} else {
  // TypeScript knows: result.error is Error
  console.error('Failed to send:', result.error.message);
}
```

### Helper Functions

```typescript
// Create success result
export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

// Create error result
export function err<T>(error: Error): Result<T> {
  return { ok: false, error };
}
```

### Implementation Example

```typescript
async editMessage(
  messageRef: MessageRef,
  newText: string
): Promise<Result<UnifiedMessage>> {
  if (!this.client) {
    return err(new ConnectionError('discord', new Error('Not connected')));
  }

  try {
    const message = await this.client.messages.edit(messageId, newText);
    return ok(normalizeMessage(message));
  } catch (error) {
    return err(new MessageEditError('discord', messageId, error));
  }
}
```

## Consequences

### Positive

- **Explicit errors**: Type signature shows operation can fail
- **Type-safe**: TypeScript narrows types in if/else blocks
- **Composable**: Easy to chain operations
- **No surprises**: Errors are values, not control flow
- **Pattern matching**: Natural with discriminated unions
- **Autocomplete**: IDEs suggest `.ok` check

### Negative

- **Verbose**: Requires checking `.ok` on every call
- **No stack unwinding**: Can't throw to escape deep call stacks
- **Learning curve**: Unfamiliar to JavaScript developers
- **Nested checks**: Multiple operations require multiple if statements

### Neutral

- **Rust-inspired**: Familiar to Rust developers, foreign to JS developers
- **Functional style**: Fits functional programming paradigm

## Alternatives Considered

### Alternative 1: Exceptions Only

```typescript
async sendMessage(channelId: string, text: string): Promise<UnifiedMessage>

// Usage
try {
  const message = await bot.sendMessage(channelId, 'Hello!');
} catch (error) {
  console.error(error);
}
```

**Pros**:
- Familiar to JavaScript developers
- Less boilerplate
- Stack unwinding for deep errors

**Cons**:
- Invisible in type signatures
- Easy to forget error handling
- Lost type information
- Forces try/catch boilerplate

**Reason for rejection**: Errors should be explicit in bot operations.

---

### Alternative 2: Either/Maybe Types (fp-ts style)

```typescript
import { Either, left, right } from 'fp-ts/Either';

async sendMessage(channelId: string, text: string): Promise<Either<Error, UnifiedMessage>>

// Usage
const result = await bot.sendMessage(channelId, 'Hello!');
pipe(
  result,
  fold(
    (error) => console.error(error),
    (message) => console.log(message)
  )
);
```

**Pros**:
- Rich functional ecosystem
- Composable with other fp-ts types
- Battle-tested

**Cons**:
- Requires fp-ts dependency
- Steep learning curve
- Unfamiliar API for most developers
- Overkill for simple success/failure

**Reason for rejection**: Too heavyweight for the problem.

---

### Alternative 3: Callback Pattern

```typescript
bot.sendMessage(channelId, 'Hello!', (error, message) => {
  if (error) {
    console.error(error);
  } else {
    console.log(message);
  }
});
```

**Pros**:
- Node.js traditional style
- Explicit error handling

**Cons**:
- Callback hell
- No async/await
- Outdated pattern
- Harder to compose

**Reason for rejection**: We're using async/await everywhere.

---

### Alternative 4: Hybrid (Result for some, throw for others)

Use Result for expected errors, throw for unexpected:

```typescript
// Expected failure: Return Result
async sendMessage(...): Promise<Result<UnifiedMessage>>

// Unexpected failure: Throw
async connect(...): Promise<void> // throws on failure
```

**Pros**:
- Best of both worlds?
- Flexibility

**Cons**:
- Inconsistent API
- Unclear when to use which
- Confusing for users
- Half the codebase still has invisible errors

**Reason for rejection**: Consistency is more important.

## Error Types

We provide specific error classes:

```typescript
export class ConnectionError extends Error {
  constructor(public platform: string, public cause: Error) {
    super(`Failed to connect to ${platform}: ${cause.message}`);
    this.name = 'ConnectionError';
  }
}

export class MessageSendError extends Error {
  constructor(public platform: string, public channelId: string, public cause: Error) {
    super(`Failed to send message on ${platform}: ${cause.message}`);
    this.name = 'MessageSendError';
  }
}

// ... more specific errors
```

Users can check error types:

```typescript
const result = await bot.sendMessage(channelId, 'Hello!');

if (!result.ok) {
  if (result.error instanceof RateLimitError) {
    // Wait and retry
    await sleep(result.error.retryAfter);
  } else if (result.error instanceof PermissionError) {
    // Log and skip
    console.error('Missing permissions');
  } else {
    // Unknown error
    throw result.error;
  }
}
```

## Ergonomics Improvements

### Helper for Unwrapping

```typescript
// For when you're confident it'll succeed
const message = result.value!; // TypeScript knows it exists after .ok check

// Or throw if it fails (escape hatch)
function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw result.error;
  return result.value;
}

const message = unwrap(await bot.sendMessage(channelId, 'Hello!'));
```

### Chaining Operations

```typescript
// Send message, then add reaction
const sendResult = await bot.sendMessage(channelId, 'Hello!');
if (!sendResult.ok) {
  return sendResult; // Early return on error
}

const reactionResult = await bot.addReaction(sendResult.value, 'thumbsup');
if (!reactionResult.ok) {
  return reactionResult;
}

// Both succeeded
return ok(reactionResult.value);
```

## Documentation Requirements

Because this pattern is unfamiliar to many JS developers, we must:

1. **Explain in README**: Show Result pattern prominently
2. **Provide examples**: Demonstrate error handling
3. **Show both paths**: Success and failure cases
4. **Compare to exceptions**: Help developers transition

Example documentation:

```typescript
// Switchboard uses Result<T> for explicit error handling
const result = await bot.sendMessage(channelId, 'Hello!');

if (result.ok) {
  // Success: result.value contains the message
  console.log('Message ID:', result.value.id);
} else {
  // Failure: result.error contains the error
  console.error('Failed:', result.error.message);
}
```

## References

- [Rust Result<T, E>](https://doc.rust-lang.org/std/result/)
- [Neverthrow library](https://github.com/supermacro/neverthrow)
- [Railway Oriented Programming](https://fsharpforfunandprofit.com/rop/)
- [Go's explicit error handling](https://go.dev/blog/error-handling-and-go)

## Validation

This pattern has proven effective:
- **Type safety**: Catches missing error handling at compile time
- **Developer feedback**: Explicit errors appreciated once understood
- **Composability**: Works well with async/await
- **Error tracking**: Specific error types enable better monitoring
