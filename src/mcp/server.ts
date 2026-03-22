#!/usr/bin/env node
/**
 * BrainBrew MCP Server
 * All plugin functionality exposed as MCP tools
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import { publish, list, clear } from '../memory/bus.js';
import { MessageTarget, MessagePersistence, MessagePriority } from '../memory/types.js';

// Plugin root from env
const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || dirname(dirname(dirname(__filename)));
const TEMPLATES_DIR = join(PLUGIN_ROOT, 'config', 'templates');

const server = new Server(
  {
    name: 'brainbrew',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ─── Tool Definitions ────────────────────────────────────────────────────────

const TOOLS = [
  // ─── Workflow/Template Tools ───
  {
    name: 'bump_template',
    description: 'Set up a workflow template in the current project. Copies agents, skills, and chain config to .claude/',
    inputSchema: {
      type: 'object',
      properties: {
        template: {
          type: 'string',
          enum: ['develop', 'devops', 'marketing', 'research', 'docs', 'support', 'data', 'moderation', 'review', 'minimal'],
          description: 'Template name to set up',
        },
      },
      required: ['template'],
    },
  },
  {
    name: 'list_templates',
    description: 'List all available workflow templates',
    inputSchema: { type: 'object', properties: {} },
  },

  // ─── Agent Tools ───
  {
    name: 'create_agent',
    description: 'Create a new agent in the project',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Agent name (e.g., "api-tester")' },
        description: { type: 'string', description: 'What the agent does' },
        tools: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tools the agent can use (e.g., ["Bash", "Read", "Edit"])',
        },
        instructions: { type: 'string', description: 'Agent instructions/prompt' },
      },
      required: ['name', 'description'],
    },
  },
  {
    name: 'list_agents',
    description: 'List all agents in the current project',
    inputSchema: { type: 'object', properties: {} },
  },

  // ─── Skill Tools ───
  {
    name: 'create_skill',
    description: 'Create a new skill in the project',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Skill name (e.g., "deploy-aws")' },
        description: { type: 'string', description: 'When to trigger this skill' },
        content: { type: 'string', description: 'Skill instructions in markdown' },
      },
      required: ['name', 'description'],
    },
  },
  {
    name: 'list_skills',
    description: 'List all skills in the current project',
    inputSchema: { type: 'object', properties: {} },
  },

  // ─── Memory Bus Tools ───
  {
    name: 'memory_add',
    description: 'Send a message to agents via Memory Bus. Use for inter-agent communication.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Message content' },
        target: {
          type: 'string',
          description: 'Who receives: "global" (all), "next" (next agent), "agent:NAME", "chain:NAME"',
          default: 'global',
        },
        persistence: {
          type: 'string',
          enum: ['session', 'once', 'permanent'],
          description: 'session (default, temp), once (consumed), permanent (forever)',
          default: 'session',
        },
        priority: {
          type: 'string',
          enum: ['low', 'normal', 'high', 'urgent'],
          default: 'normal',
        },
      },
      required: ['content'],
    },
  },
  {
    name: 'memory_list',
    description: 'List messages in the Memory Bus',
    inputSchema: {
      type: 'object',
      properties: {
        agent: { type: 'string', description: 'Filter by agent' },
      },
    },
  },
  {
    name: 'memory_clear',
    description: 'Clear messages from Memory Bus',
    inputSchema: {
      type: 'object',
      properties: {
        agent: { type: 'string', description: 'Clear for specific agent' },
        all: { type: 'boolean', description: 'Clear all messages' },
      },
    },
  },

  // ─── Chain Tools ───
  {
    name: 'get_chain_flow',
    description: 'Get the current chain flow configuration',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'add_agent_to_flow',
    description: 'Add an agent to the chain flow',
    inputSchema: {
      type: 'object',
      properties: {
        agent: { type: 'string', description: 'Agent name to add' },
        routes: {
          type: 'object',
          description: 'Routes map: { "next-agent": "description" }',
        },
        decide: { type: 'string', description: 'AI routing prompt' },
      },
      required: ['agent', 'routes'],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

// ─── Tool Handlers ───────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const cwd = process.cwd();

  try {
    switch (name) {
      // ─── bump_template ───
      case 'bump_template': {
        const template = args?.template as string;
        const templateDir = join(TEMPLATES_DIR, template);
        const templateYaml = join(TEMPLATES_DIR, `${template}.yaml`);

        if (!existsSync(templateYaml)) {
          return error(`Template "${template}" not found`);
        }

        // Create directories
        const dirs = ['.claude/agents', '.claude/skills', '.claude/hooks', '.claude/memory'];
        dirs.forEach(d => mkdirSync(join(cwd, d), { recursive: true }));

        // Copy agents
        const agentsDir = join(templateDir, 'agents');
        let agentCount = 0;
        if (existsSync(agentsDir)) {
          readdirSync(agentsDir).filter(f => f.endsWith('.md')).forEach(f => {
            copyFileSync(join(agentsDir, f), join(cwd, '.claude/agents', f));
            agentCount++;
          });
        }

        // Copy skills
        const skillsDir = join(templateDir, 'skills');
        let skillCount = 0;
        if (existsSync(skillsDir)) {
          readdirSync(skillsDir).forEach(skill => {
            const src = join(skillsDir, skill);
            const dest = join(cwd, '.claude/skills', skill);
            mkdirSync(dest, { recursive: true });
            readdirSync(src).forEach(f => {
              copyFileSync(join(src, f), join(dest, f));
            });
            skillCount++;
          });
        }

        // Copy chain config
        copyFileSync(templateYaml, join(cwd, '.claude/chain-config.yaml'));

        // Read flow for display
        const config = readFileSync(templateYaml, 'utf-8');
        const flowMatch = config.match(/flow:[\s\S]*/);
        const flow = flowMatch ? flowMatch[0].substring(0, 500) : '';

        return success(`✓ Template "${template}" set up!\n\nAgents: ${agentCount}\nSkills: ${skillCount}\n\n${flow}`);
      }

      // ─── list_templates ───
      case 'list_templates': {
        const templates = readdirSync(TEMPLATES_DIR)
          .filter(f => f.endsWith('.yaml'))
          .map(f => f.replace('.yaml', ''));

        const info = templates.map(t => {
          const yaml = readFileSync(join(TEMPLATES_DIR, `${t}.yaml`), 'utf-8');
          const desc = yaml.split('\n').find(l => l.startsWith('#'))?.replace('#', '').trim() || '';
          return `- **${t}**: ${desc}`;
        }).join('\n');

        return success(`Available templates:\n\n${info}`);
      }

      // ─── create_agent ───
      case 'create_agent': {
        const agentName = args?.name as string;
        const description = args?.description as string;
        const tools = (args?.tools as string[]) || ['Bash', 'Read', 'Edit', 'Grep', 'Glob'];
        const instructions = args?.instructions as string || '';

        const agentPath = join(cwd, '.claude/agents', `${agentName}.md`);
        mkdirSync(dirname(agentPath), { recursive: true });

        const content = `---
name: ${agentName}
description: >-
  ${description}
tools:
${tools.map(t => `  - ${t}`).join('\n')}
---

# ${agentName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Agent

${instructions || `## Responsibilities

1. [Responsibility 1]
2. [Responsibility 2]

## Output Format

[Expected output structure]`}
`;

        writeFileSync(agentPath, content);
        return success(`✓ Created agent: ${agentPath}`);
      }

      // ─── list_agents ───
      case 'list_agents': {
        const agentsDir = join(cwd, '.claude/agents');
        if (!existsSync(agentsDir)) {
          return success('No agents found. Run bump_template first.');
        }

        const agents = readdirSync(agentsDir)
          .filter(f => f.endsWith('.md'))
          .map(f => {
            const content = readFileSync(join(agentsDir, f), 'utf-8');
            const descMatch = content.match(/description:\s*>?-?\s*\n?\s*(.+)/);
            const desc = descMatch ? descMatch[1].trim() : '';
            return `- **${f.replace('.md', '')}**: ${desc.substring(0, 60)}`;
          });

        return success(`Agents (${agents.length}):\n\n${agents.join('\n')}`);
      }

      // ─── create_skill ───
      case 'create_skill': {
        const skillName = args?.name as string;
        const description = args?.description as string;
        const content = args?.content as string || '';

        const skillDir = join(cwd, '.claude/skills', skillName);
        mkdirSync(skillDir, { recursive: true });

        const skillContent = `---
name: ${skillName}
description: >-
  ${description}
---

# ${skillName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}

${content || `## Steps

1. [Step 1]
2. [Step 2]

## Output

[Expected output]`}
`;

        writeFileSync(join(skillDir, 'SKILL.md'), skillContent);
        return success(`✓ Created skill: ${skillDir}/SKILL.md`);
      }

      // ─── list_skills ───
      case 'list_skills': {
        const skillsDir = join(cwd, '.claude/skills');
        if (!existsSync(skillsDir)) {
          return success('No skills found. Run bump_template first.');
        }

        const skills = readdirSync(skillsDir)
          .filter(s => existsSync(join(skillsDir, s, 'SKILL.md')))
          .map(s => {
            const content = readFileSync(join(skillsDir, s, 'SKILL.md'), 'utf-8');
            const descMatch = content.match(/description:\s*>?-?\s*\n?\s*(.+)/);
            const desc = descMatch ? descMatch[1].trim() : '';
            return `- **${s}**: ${desc.substring(0, 60)}`;
          });

        return success(`Skills (${skills.length}):\n\n${skills.join('\n')}`);
      }

      // ─── memory_add ───
      case 'memory_add': {
        const content = args?.content as string;
        const target = (args?.target as MessageTarget) || 'global';
        const persistence = (args?.persistence as MessagePersistence) || 'session';
        const priority = (args?.priority as MessagePriority) || 'normal';

        const msg = publish(content, {
          target,
          persistence,
          priority,
          createdBy: 'mcp',
          cwd,
        });

        return success(`✓ Message added\n  Target: ${msg.target}\n  Persistence: ${msg.persistence}`);
      }

      // ─── memory_list ───
      case 'memory_list': {
        const messages = list({ agentType: args?.agent as string, cwd });

        if (messages.length === 0) {
          return success('No messages in Memory Bus');
        }

        const output = messages
          .map((m, i) => `${i + 1}. [${m.target}] (${m.persistence}) - ${m.content}`)
          .join('\n');

        return success(`Memory Bus (${messages.length}):\n\n${output}`);
      }

      // ─── memory_clear ───
      case 'memory_clear': {
        const cleared = clear({
          agentType: args?.agent as string,
          all: args?.all as boolean,
          cwd,
        });

        return success(`✓ Cleared ${cleared} messages`);
      }

      // ─── get_chain_flow ───
      case 'get_chain_flow': {
        const configPath = join(cwd, '.claude/chain-config.yaml');
        if (!existsSync(configPath)) {
          return success('No chain config. Run bump_template first.');
        }

        const config = readFileSync(configPath, 'utf-8');
        return success(`Chain Config:\n\n\`\`\`yaml\n${config}\n\`\`\``);
      }

      // ─── add_agent_to_flow ───
      case 'add_agent_to_flow': {
        const agent = args?.agent as string;
        const routes = args?.routes as Record<string, string>;
        const decide = args?.decide as string;

        const configPath = join(cwd, '.claude/chain-config.yaml');
        if (!existsSync(configPath)) {
          return error('No chain config. Run bump_template first.');
        }

        let config = readFileSync(configPath, 'utf-8');

        // Build YAML for new agent
        let newFlow = `\n  ${agent}:\n    routes:\n`;
        for (const [target, desc] of Object.entries(routes)) {
          newFlow += `      ${target}: "${desc}"\n`;
        }
        if (decide) {
          newFlow += `    decide: |\n      ${decide.split('\n').join('\n      ')}\n`;
        }

        // Append to flow section
        config = config.replace(/^(flow:)/m, `$1${newFlow}`);
        writeFileSync(configPath, config);

        return success(`✓ Added ${agent} to chain flow`);
      }

      default:
        return error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return error((err as Error).message);
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function success(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

function error(text: string) {
  return { content: [{ type: 'text' as const, text: `Error: ${text}` }], isError: true };
}

// ─── Start Server ────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
