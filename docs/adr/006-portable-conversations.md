# ADR-006: Portable Conversations

**Status**: Accepted

**Date**: 2026-05-20

**Deciders**: Core team

## Context

Switchboard normalizes messages across chat platforms, but AI bots also need a way to keep conversational history portable across Discord, Slack, and future adapters.

We need a conversation layer that:

1. Works with normalized `UnifiedMessage` objects
2. Does not require platform adapters to implement new state behavior
3. Can export recent history to AI SDK-compatible messages
4. Lets users bring their own durable storage when needed
5. Keeps Switchboard lighter than full stateful agent frameworks

Vercel Chat SDK and similar frameworks provide richer stateful agent surfaces, often including UI primitives, persistent state patterns, and framework-specific conventions. Switchboard should interoperate with those tools without becoming one.

## Decision

Add a lightweight portable conversation layer to core:

- `Bot.conversationFor(message, options?)` creates a `Conversation` anchored to a normalized message
- `Conversation.append(message, role?, metadata?)` records portable message history
- `Conversation.toAISDKMessages({ limit?, since? })` exports `system`, `user`, and `assistant` messages for AI SDK calls
- `ConversationStore` defines the persistence contract
- `InMemoryConversationStore` provides zero-infra storage for examples, tests, and local bots

Conversation keys are derived from platform, channel, and thread/message identifiers. Platform adapters stay unchanged because conversations operate above the adapter layer.

## Consequences

### Positive

- **Portable history**: Bot code can preserve conversation context across supported platforms
- **AI SDK friendly**: History can be passed directly into AI SDK model calls
- **No required backend**: The in-memory store keeps simple bots simple
- **Storage agnostic**: Production bots can implement `ConversationStore` with Redis, Postgres, files, or another backend
- **Adapter neutral**: Existing adapters do not need new state APIs

### Negative

- **In-memory data is ephemeral**: Bots that restart lose history unless they provide a durable store
- **Limited scope**: This does not provide rich agent UI, workflow state machines, or framework-managed persistence
- **Explicit Result handling**: Store and export operations return `Result<T>`, so callers must check failures

### Neutral

- **BYO AI runtime**: Switchboard prepares prompt messages but does not choose the model provider
- **Framework positioning**: This complements Vercel Chat SDK-style tools instead of replacing their full stateful app stack

## Alternatives Considered

### Alternative 1: Require Vercel Chat SDK or a Stateful Agent Framework

**Pros**:

- Rich agent patterns already exist
- Persistent state guidance is available
- Strong fit for full web app experiences

**Cons**:

- Adds framework coupling to a platform SDK
- Increases setup cost for lightweight bots
- Pulls Switchboard away from its adapter-focused abstraction

**Reason for rejection**: Switchboard should stay a small cross-platform bot SDK and interoperate with AI frameworks without requiring one.

---

### Alternative 2: Store Conversation State in Platform Adapters

**Pros**:

- Adapters know platform-specific thread semantics
- Could use native platform state when available

**Cons**:

- Forces every adapter to implement state behavior
- Produces inconsistent persistence guarantees across platforms
- Makes one-line platform swaps harder to reason about

**Reason for rejection**: Conversations should be normalized in core, not reimplemented per adapter.

---

### Alternative 3: Leave Conversation History Entirely to Users

**Pros**:

- No new core API surface
- Maximum flexibility

**Cons**:

- Every bot repeats keying, normalization, and AI SDK export logic
- Harder to write portable examples
- More room for platform-specific branching

**Reason for rejection**: A small core helper removes common boilerplate while preserving user-controlled storage.

## References

- [API Reference: Portable Conversations](../api/README.md#portable-conversations-conversationfor)
- [ADR-004: Result Type for Error Handling](./004-result-type-pattern.md)
