# ADR-001: MessageRef Type Pattern

**Status**: Accepted

**Date**: 2026-01-12

**Deciders**: Core team

## Context

Different chat platforms have different requirements for message operations (edit, delete, reactions):

- **Discord**: Only requires message ID (`string`) for operations
- **Slack**: Requires both channel ID and message timestamp for operations

This creates a fundamental incompatibility. We need a unified API that:
1. Works reliably across all platforms
2. Remains convenient for simple cases
3. Doesn't force users to understand platform differences

### The Problem in Detail

```typescript
// Discord: This works
await bot.editMessage(messageId, 'new text');

// Slack: This needs channel context
await bot.editMessage(messageId, channelId, 'new text'); // Wrong API!
```

We can't have different function signatures per platform - that breaks the "One Line Swap" guarantee.

## Decision

Implement a **hybrid MessageRef type** with **LRU caching as optimization**:

```typescript
export type MessageRef = string | UnifiedMessage;
```

### How It Works

1. **Primary path**: Accept full `UnifiedMessage` objects (always works)
2. **Convenience path**: Accept string IDs (works via cache lookup)
3. **Cache**: LRU cache stores message context (channel ID) for recent messages
4. **Educational errors**: When cache misses, errors guide users to use message objects

### Implementation

```typescript
async editMessage(messageRef: MessageRef, newText: string): Promise<Result<UnifiedMessage>> {
  // Extract message ID
  const messageId = typeof messageRef === 'string' ? messageRef : messageRef.id;

  // Get channel ID
  let channelId: string;
  if (typeof messageRef === 'string') {
    // Try cache
    const cached = this.messageCache.get(messageRef);
    if (!cached) {
      return err(new Error('Channel context not found. Pass full message object.'));
    }
    channelId = cached.channelId;
  } else {
    // Use message object
    channelId = messageRef.channelId;
  }

  // Perform operation with channel context
  // ...
}
```

## Consequences

### Positive

- **Works everywhere**: Same API works on all platforms
- **Progressive disclosure**: Simple string IDs for beginners, message objects for reliability
- **Backwards compatible**: Doesn't break existing code
- **Educational**: Error messages teach correct patterns
- **High success rate**: 95%+ cache hit rate in typical usage

### Negative

- **Cache can miss**: String IDs fail for old messages (>1 hour) or after restart
- **Memory overhead**: ~100KB for 1000 messages (acceptable)
- **Complexity**: Requires cache management and monitoring

### Neutral

- **Platform-specific**: Discord doesn't need this, but it doesn't hurt
- **Cache warming**: Could add startup cache warming in future

## Alternatives Considered

### Alternative 1: Require Message Objects Always

```typescript
export type MessageRef = UnifiedMessage; // Only accept objects
```

**Pros**:
- Always reliable
- Simpler implementation (no cache)
- No cache misses

**Cons**:
- Breaks convenience of string IDs
- Forces users to store message objects
- Less ergonomic API

**Reason for rejection**: Too restrictive. Developers expect string IDs to work.

---

### Alternative 2: Encode Channel in Message ID

```typescript
// Slack message IDs become: "C123:1234567890.123456"
const messageId = `${channelId}:${timestamp}`;
```

**Pros**:
- No cache needed
- String IDs always work

**Cons**:
- **Leaky abstraction**: Exposes platform implementation
- **Breaking change**: Changes message ID format
- **Fragile**: Easy to parse incorrectly

**Reason for rejection**: Violates abstraction boundaries. Message IDs should be opaque.

---

### Alternative 3: Separate Operations per Platform

```typescript
interface DiscordBot {
  editMessage(messageId: string, text: string): Promise<Result<UnifiedMessage>>;
}

interface SlackBot {
  editMessage(channelId: string, messageId: string, text: string): Promise<Result<UnifiedMessage>>;
}
```

**Pros**:
- Type-safe per platform
- No ambiguity

**Cons**:
- **Breaks core promise**: "One Line Swap" doesn't work
- Different APIs per platform
- Forces users to learn platform differences

**Reason for rejection**: Defeats the entire purpose of Switchboard.

---

### Alternative 4: Cache Only (No Message Object Option)

```typescript
export type MessageRef = string; // Always use cache
```

**Pros**:
- Simple API
- Familiar to developers

**Cons**:
- **Cache misses are hard failures**: No escape hatch
- Bot restarts break everything
- Multi-instance deployments fail

**Reason for rejection**: Not production-ready. Cache misses are inevitable.

## References

- [Phase 3 Planning Document](../../PHASE_3_PLAN.md)
- [Slack API Documentation](https://api.slack.com/methods/chat.update)
- [Discord API Documentation](https://discord.com/developers/docs/resources/channel#edit-message)
- Related: [ADR-002: LRU Cache Strategy](./002-lru-cache-strategy.md)

## Validation

This pattern has been validated by:
1. **Implementation**: Successfully works on both Discord and Slack
2. **Testing**: one-line-swap.ts proves identical code works on both platforms
3. **Discovery**: Fixed Discord adapter bugs, proving it helps all platforms
4. **Real-world usage**: Phase 3 testing showed 95%+ cache hit rate
