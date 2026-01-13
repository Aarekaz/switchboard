# Architecture Decision Records (ADRs)

This directory contains records of architectural decisions made in the Switchboard project.

## Format

Each ADR follows this structure:
- **Status**: Accepted, Proposed, Deprecated, Superseded
- **Context**: The issue motivating this decision
- **Decision**: The change being proposed or made
- **Consequences**: The resulting context after applying the decision

## Index

- [ADR-001: MessageRef Type Pattern](./001-message-ref-pattern.md) - Hybrid approach for message references
- [ADR-002: LRU Cache Strategy for Slack](./002-lru-cache-strategy.md) - Message context caching
- [ADR-003: Auto-Registration Pattern](./003-auto-registration-pattern.md) - Side-effect imports for adapters
- [ADR-004: Result Type for Error Handling](./004-result-type-pattern.md) - Explicit error handling
- [ADR-005: Emoji Mapping Strategy](./005-emoji-mapping-strategy.md) - Cross-platform emoji support

## Creating New ADRs

When making significant architectural decisions:

1. Copy the template below
2. Number it sequentially (ADR-XXX)
3. Fill in all sections
4. Update this index
5. Get review in PR

### Template

```markdown
# ADR-XXX: [Title]

**Status**: Proposed | Accepted | Deprecated | Superseded by ADR-YYY

**Date**: YYYY-MM-DD

**Deciders**: [List of people involved]

## Context

[Describe the problem and why this decision is needed]

## Decision

[Describe the decision and how it solves the problem]

## Consequences

### Positive
- [Good outcome]

### Negative
- [Trade-off]

### Neutral
- [Side effect]

## Alternatives Considered

### Alternative 1: [Name]
- **Pros**: [Benefits]
- **Cons**: [Drawbacks]
- **Reason for rejection**: [Why we didn't choose this]

## References

- [Link to relevant issues, discussions, or documentation]
```
