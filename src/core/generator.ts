import { writeFileSync, existsSync, mkdirSync, copyFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { AGENTS_DIR, HOOKS_DIR, BACKUP_DIR, CHAIN_CONFIG_FILE, VERIFICATION_RULES_FILE } from '../utils/paths.js';
import type { ChainDef, AgentDef } from './config.js';

interface GenerateResult {
  configWritten: boolean;
  verificationWritten: boolean;
  agentsCreated: string[];
  agentsSkipped: string[];
  backupPaths: string[];
}

export function generate(chain: ChainDef): GenerateResult {
  const result: GenerateResult = {
    configWritten: false,
    verificationWritten: false,
    agentsCreated: [],
    agentsSkipped: [],
    backupPaths: [],
  };

  // Ensure directories
  if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });
  if (!existsSync(AGENTS_DIR)) mkdirSync(AGENTS_DIR, { recursive: true });
  if (!existsSync(HOOKS_DIR)) mkdirSync(HOOKS_DIR, { recursive: true });

  // Backup existing files
  if (existsSync(CHAIN_CONFIG_FILE)) {
    const backup = join(BACKUP_DIR, 'chain-config.json.bak');
    copyFileSync(CHAIN_CONFIG_FILE, backup);
    result.backupPaths.push(backup);
  }
  if (existsSync(VERIFICATION_RULES_FILE)) {
    const backup = join(BACKUP_DIR, 'verification-rules.json.bak');
    copyFileSync(VERIFICATION_RULES_FILE, backup);
    result.backupPaths.push(backup);
  }

  // Generate chain-config.json
  const config = buildChainConfig(chain);
  writeFileSync(CHAIN_CONFIG_FILE, JSON.stringify(config, null, 2));
  result.configWritten = true;

  // Generate verification-rules.json
  const rules = buildVerificationRules(chain);
  writeFileSync(VERIFICATION_RULES_FILE, JSON.stringify(rules, null, 2));
  result.verificationWritten = true;

  // Generate agent .md files (existing: false only)
  for (const agent of chain.agents) {
    if (agent.existing) continue;
    const file = join(AGENTS_DIR, `${agent.name}.md`);
    if (existsSync(file)) {
      result.agentsSkipped.push(agent.name);
      continue;
    }
    writeFileSync(file, buildAgentMd(agent));
    result.agentsCreated.push(agent.name);
  }

  return result;
}

function buildChainConfig(chain: ChainDef): Record<string, unknown> {
  const agents: Record<string, unknown> = {};

  for (const [name, entry] of Object.entries(chain.flow)) {
    const agentConfig: Record<string, unknown> = {
      chainNext: entry.next,
    };

    // Add verification from chain def
    const verif = chain.verification?.[name];
    if (verif) {
      agentConfig.verification = {
        minLength: verif.minLength || 50,
        required: verif.requiredAny || [],
        regexChecks: {},
      };
    }

    // Add conditional routing
    if (entry.on_issues || entry.on_fail) {
      agentConfig.conditionalNext = {};
      if (entry.on_issues) (agentConfig.conditionalNext as Record<string, string>).on_issues = entry.on_issues;
      if (entry.on_fail) (agentConfig.conditionalNext as Record<string, string>).on_fail = entry.on_fail;
    }

    agents[name] = agentConfig;
  }

  return {
    version: '2.0',
    source: `chains/${chain.name}.yaml`,
    agents,
    maxRetries: 2,
    logging: {
      unified: true,
      logFile: '~/.claude/tmp/chain-events.jsonl',
    },
  };
}

function buildVerificationRules(chain: ChainDef): Record<string, unknown> {
  const rules: Record<string, unknown> = {};

  for (const [name, entry] of Object.entries(chain.flow)) {
    const verif = chain.verification?.[name];
    rules[name] = {
      minLength: verif?.minLength || 50,
      required: verif?.requiredAny || [],
      requiredAny: true,
      chainNext: entry.next,
    };
  }

  return rules;
}

function buildAgentMd(agent: AgentDef): string {
  const frontmatter: string[] = ['---'];
  frontmatter.push(`name: ${agent.name}`);
  if (agent.description) {
    frontmatter.push(`description: >-`);
    frontmatter.push(`  ${agent.description}`);
  }
  if (agent.model) frontmatter.push(`model: ${agent.model}`);
  if (agent.tools?.length) frontmatter.push(`tools: ${agent.tools.join(', ')}`);
  if (agent.maxTurns) frontmatter.push(`maxTurns: ${agent.maxTurns}`);
  if (agent.color) frontmatter.push(`color: ${agent.color}`);
  if (agent.skills?.length) {
    frontmatter.push('skills:');
    for (const skill of agent.skills) frontmatter.push(`  - ${skill}`);
  }
  frontmatter.push('---');
  frontmatter.push('');

  const prompt = agent.prompt || `${agent.name} agent.`;
  frontmatter.push(prompt);
  frontmatter.push('');

  return frontmatter.join('\n');
}

export function formatResult(result: GenerateResult): string {
  const lines: string[] = [];
  if (result.configWritten) lines.push('  Written: chain-config.json');
  if (result.verificationWritten) lines.push('  Written: verification-rules.json');
  if (result.agentsCreated.length) lines.push(`  Created agents: ${result.agentsCreated.join(', ')}`);
  if (result.agentsSkipped.length) lines.push(`  Skipped (exists): ${result.agentsSkipped.join(', ')}`);
  if (result.backupPaths.length) lines.push(`  Backups: ${result.backupPaths.length} files`);
  return lines.join('\n');
}
