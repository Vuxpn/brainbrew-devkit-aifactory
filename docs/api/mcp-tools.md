# MCP Tools Reference

All brainbrew functionality exposed via MCP tools.

## Template Tools

### template_bump

Set up a workflow template in the current project.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| template | string | Yes | Template name: develop, devops, marketing, research, docs, support, data, moderation, review, minimal |

**Example:**

```
mcp__brainbrew__template_bump(template: "develop")
```

### template_list

List all available workflow templates.

**Parameters:** None

**Example:**

```
mcp__brainbrew__template_list()
```

## Chain Tools

### chain_validate

Validate the active chain config.

**Checks:**
- All agents in flow exist
- Team nodes have valid teammates
- Routes point to valid targets
- No dead-end nodes

**Parameters:** None

**Example:**

```
mcp__brainbrew__chain_validate()
```

### chain_list

List all available chains and show which is active.

**Parameters:** None

**Example:**

```
mcp__brainbrew__chain_list()
```

### chain_switch

Switch the active chain.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| chain | string | Yes | Chain name to activate |

**Example:**

```
mcp__brainbrew__chain_switch(chain: "discovery")
```

## Memory Bus Tools

### memory_add

Send a message to agents via Memory Bus.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| content | string | Yes | - | Message content |
| target | string | No | global | Who receives: global, next, agent:NAME, chain:NAME |
| persistence | string | No | session | session, once, permanent |
| priority | string | No | normal | low, normal, high, urgent |

**Example:**

```
mcp__brainbrew__memory_add(
  content: "Fix the auth bug",
  target: "agent:implementer",
  persistence: "once"
)
```

### memory_list

List messages in the Memory Bus.

**Parameters:** None

**Example:**

```
mcp__brainbrew__memory_list()
```

### memory_clear

Clear messages from Memory Bus.

**Parameters:** None (clears all session messages)

**Example:**

```
mcp__brainbrew__memory_clear()
```
