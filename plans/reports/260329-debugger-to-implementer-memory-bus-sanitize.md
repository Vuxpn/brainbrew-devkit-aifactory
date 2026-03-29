# Debug Report: Memory Bus sanitizeContent Test Failure

**From:** debugger
**To:** implementer
**Date:** 2026-03-29
**Task:** Determine correct fix for sanitizeContent storage vs render-time issue

---

## Root Cause

**The test failure is "No test files found"** — vitest exits with code 1 because there are zero `*.test.ts` / `*.spec.ts` files in the project (outside node_modules). The tester agent had nothing to run.

The underlying question is: should `sanitizeContent()` be called at **storage time** (`addMemory`/`publish`) or remain at **render time** (`formatForContext`)?

---

## Code Flow Analysis

```
src/memory/cli.ts   addMemory(content, opts)
  → publish(content, ...)          # stores raw content as-is
      → bus.json (raw storage)

src/hooks/subagent-start.ts
  → subscribe(agentType, ...)      # reads messages
  → formatForContext(messages)     # calls sanitizeContent() per message
      → injected into agent system-reminder
```

Key files:
- `/Users/noroom113/company/brainbrewlabs/brainbrew-devkit/src/memory/bus.ts` — `sanitizeContent()` at line 277, used only inside `formatForContext()` at lines 301/308/318
- `/Users/noroom113/company/brainbrewlabs/brainbrew-devkit/src/memory/cli.ts` — `addMemory()` at line 21, calls `publish()` with raw content
- `/Users/noroom113/company/brainbrewlabs/brainbrew-devkit/src/hooks/subagent-start.ts` — calls `formatForContext()` at line 109

---

## Design Verdict: Render-time sanitization is CORRECT

The security concern is injection into agent context. That injection happens exclusively in `subagent-start.ts` via `formatForContext()`. Sanitizing at render time is the right pattern because:

1. `listMemory()` in cli.ts prints `msg.content` raw to stdout for human inspection — raw content is useful there
2. `sanitizeContent()` strips markdown headers (`#+`) and collapses newlines to prevent prompt injection when content is embedded in a `<system-reminder>` block
3. Storing raw content lets future consumers (e.g., a different renderer) decide their own sanitization rules
4. The 500-char truncation in `sanitizeContent()` is a render concern, not a storage concern

---

## Fix Required: Add a test file (not change production code)

The test failure is purely "no test files exist." The production code design is correct. The implementer needs to create `src/memory/bus.test.ts` with tests that match the actual behavior:

### Test assertions to write

```typescript
// Test: sanitizeContent NOT applied at storage time
publish("# header\nline two", { ... })
// stored content should equal "# header\nline two" (raw)

// Test: sanitizeContent IS applied at render time
formatForContext([{ content: "# header\nline two", ... }])
// output should NOT contain "# header" or literal \n between words
// output should contain "- header line two" (headers stripped, newlines collapsed)

// Test: addMemory stores raw
addMemory("## title\nsome text")
// message in store: content === "## title\nsome text"
```

### File to create
`/Users/noroom113/company/brainbrewlabs/brainbrew-devkit/src/memory/bus.test.ts`

### Test framework
vitest (already in package.json scripts: `"test": "vitest run"`)

---

## Implementer Action Items

1. Create `src/memory/bus.test.ts` with tests covering:
   - `publish()` stores raw content (no sanitization)
   - `formatForContext()` strips `#` headers from content
   - `formatForContext()` collapses `\n` into spaces
   - `formatForContext()` truncates at 500 chars
   - `subscribe()` returns messages and marks `once`-persistence messages consumed
2. Do NOT change `bus.ts` production code — render-time sanitization is the correct design
3. Run `npm test` to verify all tests pass

---

## No unresolved questions
