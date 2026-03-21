import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { CHAINS_DIR, CHAIN_CONFIG_FILE } from '../utils/paths.js';

export interface AgentDef {
  name: string;
  existing: boolean;
  description?: string;
  model?: string;
  tools?: string[];
  skills?: string[];
  maxTurns?: number;
  color?: string;
  prompt?: string;
}

export interface FlowEntry {
  next: string | null;
  on_issues?: string;
  on_fail?: string;
}

export interface VerificationEntry {
  minLength?: number;
  requiredAny?: string[];
}

export interface ChainDef {
  name: string;
  description: string;
  version: number;
  agents: AgentDef[];
  flow: Record<string, FlowEntry>;
  verification?: Record<string, VerificationEntry>;
}

/**
 * Parse chain YAML (simple subset — no full YAML parser needed)
 */
export function parseChainYaml(content: string): ChainDef {
  const lines = content.split('\n');
  const chain: ChainDef = {
    name: '',
    description: '',
    version: 1,
    agents: [],
    flow: {},
  };

  let section: 'root' | 'agents' | 'flow' | 'verification' = 'root';
  let currentAgent: Partial<AgentDef> | null = null;
  let currentFlowAgent = '';
  let currentVerifAgent = '';
  let inPrompt = false;
  let promptLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trimEnd();

    // Handle multi-line prompt
    if (inPrompt) {
      if (line.match(/^\s{4}\S/) || line.match(/^\s{6}\S/) || line.trim() === '') {
        promptLines.push(line.replace(/^\s{4,6}/, ''));
        continue;
      } else {
        if (currentAgent) currentAgent.prompt = promptLines.join('\n').trim();
        inPrompt = false;
        promptLines = [];
      }
    }

    // Section headers
    if (trimmed === 'agents:') { section = 'agents'; continue; }
    if (trimmed === 'flow:') { section = 'flow'; continue; }
    if (trimmed === 'verification:') { section = 'verification'; chain.verification = {}; continue; }

    // Root fields
    if (section === 'root') {
      const m = trimmed.match(/^(\w+):\s*(.+)/);
      if (m) {
        const [, key, val] = m;
        if (key === 'name') chain.name = val.replace(/["']/g, '');
        if (key === 'description') chain.description = val.replace(/["']/g, '');
        if (key === 'version') chain.version = parseInt(val);
      }
      continue;
    }

    // Agents section
    if (section === 'agents') {
      if (trimmed.match(/^\s+-\s+name:\s+/)) {
        if (currentAgent?.name) chain.agents.push(currentAgent as AgentDef);
        const name = trimmed.replace(/^\s+-\s+name:\s+/, '').trim();
        currentAgent = { name, existing: true };
        continue;
      }
      if (currentAgent && trimmed.match(/^\s+\w+:/)) {
        const m = trimmed.match(/^\s+(\w+):\s*(.*)/);
        if (m) {
          const [, key, val] = m;
          const v = val.replace(/["']/g, '').trim();
          if (key === 'existing') currentAgent.existing = v === 'true';
          else if (key === 'description') currentAgent.description = v;
          else if (key === 'model') currentAgent.model = v;
          else if (key === 'maxTurns') currentAgent.maxTurns = parseInt(v);
          else if (key === 'color') currentAgent.color = v;
          else if (key === 'tools') currentAgent.tools = parseYamlList(v);
          else if (key === 'skills') currentAgent.skills = parseYamlList(v);
          else if (key === 'prompt') {
            if (v === '|') { inPrompt = true; promptLines = []; }
            else currentAgent.prompt = v;
          }
        }
        continue;
      }
    }

    // Flow section
    if (section === 'flow') {
      const agentMatch = trimmed.match(/^\s{2}(\S+):$/);
      if (agentMatch) {
        currentFlowAgent = agentMatch[1];
        chain.flow[currentFlowAgent] = { next: null };
        continue;
      }
      if (currentFlowAgent && trimmed.match(/^\s{4}\w+:/)) {
        const m = trimmed.match(/^\s{4}(\w+):\s*(.*)/);
        if (m) {
          const [, key, val] = m;
          const v = val.trim() === 'null' ? null : val.trim();
          if (key === 'next') chain.flow[currentFlowAgent].next = v;
          else if (key === 'on_issues') chain.flow[currentFlowAgent].on_issues = v || undefined;
          else if (key === 'on_fail') chain.flow[currentFlowAgent].on_fail = v || undefined;
        }
        continue;
      }
    }

    // Verification section
    if (section === 'verification' && chain.verification) {
      const agentMatch = trimmed.match(/^\s{2}(\S+):$/);
      if (agentMatch) {
        currentVerifAgent = agentMatch[1];
        chain.verification[currentVerifAgent] = {};
        continue;
      }
      if (currentVerifAgent && trimmed.match(/^\s{4}\w+:/)) {
        const m = trimmed.match(/^\s{4}(\w+):\s*(.*)/);
        if (m) {
          const [, key, val] = m;
          if (key === 'minLength') chain.verification[currentVerifAgent].minLength = parseInt(val);
          else if (key === 'requiredAny') chain.verification[currentVerifAgent].requiredAny = parseYamlList(val);
        }
        continue;
      }
    }
  }

  // Push last agent
  if (currentAgent?.name) chain.agents.push(currentAgent as AgentDef);
  if (inPrompt && currentAgent) currentAgent.prompt = promptLines.join('\n').trim();

  return chain;
}

function parseYamlList(val: string): string[] {
  // Handle [a, b, c] format
  const m = val.match(/\[(.+)\]/);
  if (m) return m[1].split(',').map(s => s.trim().replace(/["']/g, ''));
  // Handle empty list
  if (val === '[]') return [];
  return [];
}

export function loadChain(name: string): ChainDef | null {
  const file = join(CHAINS_DIR, `${name}.yaml`);
  if (!existsSync(file)) return null;
  return parseChainYaml(readFileSync(file, 'utf-8'));
}

export function loadChainConfig(): Record<string, unknown> | null {
  if (!existsSync(CHAIN_CONFIG_FILE)) return null;
  try {
    return JSON.parse(readFileSync(CHAIN_CONFIG_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

export function listChains(): string[] {
  if (!existsSync(CHAINS_DIR)) return [];
  return readdirSync(CHAINS_DIR)
    .filter(f => f.endsWith('.yaml'))
    .map(f => f.replace('.yaml', ''));
}
