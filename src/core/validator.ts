import { existsSync } from 'fs';
import { join } from 'path';
import { AGENTS_DIR, SKILLS_DIR } from '../utils/paths.js';
import type { ChainDef } from './config.js';

interface ValidationResult {
  pass: boolean;
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message: string;
  }>;
}

export function validateChain(chain: ChainDef): ValidationResult {
  const checks: ValidationResult['checks'] = [];
  const agentNames = new Set(chain.agents.map(a => a.name));
  const flowAgents = new Set(Object.keys(chain.flow));
  const allTargets = new Set<string>();

  // Collect all link targets
  for (const [, entry] of Object.entries(chain.flow)) {
    if (entry.next) allTargets.add(entry.next);
    if (entry.on_issues) allTargets.add(entry.on_issues);
    if (entry.on_fail) allTargets.add(entry.on_fail);
  }

  // 1. Agents exist
  const missingAgents: string[] = [];
  for (const agent of chain.agents) {
    if (agent.existing) {
      const file = join(AGENTS_DIR, `${agent.name}.md`);
      if (!existsSync(file)) missingAgents.push(agent.name);
    } else {
      if (!agent.prompt) missingAgents.push(`${agent.name} (no prompt)`);
    }
  }
  checks.push({
    name: 'Agents exist',
    status: missingAgents.length ? 'fail' : 'pass',
    message: missingAgents.length
      ? `Missing: ${missingAgents.join(', ')}`
      : `All ${chain.agents.length} agents have definitions`,
  });

  // 2. Broken links
  const brokenLinks: string[] = [];
  for (const [agent, entry] of Object.entries(chain.flow)) {
    for (const [key, target] of Object.entries(entry)) {
      if (key === 'next' && target === null) continue;
      if (target && !agentNames.has(target as string)) {
        brokenLinks.push(`${agent}.${key} → ${target}`);
      }
    }
  }
  checks.push({
    name: 'No broken links',
    status: brokenLinks.length ? 'fail' : 'pass',
    message: brokenLinks.length
      ? `Broken: ${brokenLinks.join(', ')}`
      : 'All links resolve',
  });

  // 3. Orphan agents
  const referencedAgents = new Set([...flowAgents, ...allTargets]);
  const orphans = chain.agents
    .map(a => a.name)
    .filter(name => !referencedAgents.has(name));
  checks.push({
    name: 'No orphan agents',
    status: orphans.length ? 'warn' : 'pass',
    message: orphans.length
      ? `Orphans: ${orphans.join(', ')}`
      : 'No orphan agents',
  });

  // 4. Terminal node
  const terminals = Object.entries(chain.flow)
    .filter(([, e]) => e.next === null)
    .map(([name]) => name);
  checks.push({
    name: 'Terminal node exists',
    status: terminals.length ? 'pass' : 'fail',
    message: terminals.length
      ? `Terminal: ${terminals.join(', ')}`
      : 'No terminal node (all agents have next)',
  });

  // 5. Cycle detection
  const cycles = detectCycles(chain.flow);
  checks.push({
    name: 'Cycle detection',
    status: cycles.length ? 'warn' : 'pass',
    message: cycles.length
      ? `${cycles.length} cycle(s): ${cycles.map(c => c.join(' → ')).join('; ')}`
      : 'No cycles',
  });

  // 6. Skills exist
  const missingSkills: string[] = [];
  for (const agent of chain.agents) {
    if (!agent.existing && agent.skills) {
      for (const skill of agent.skills) {
        if (!existsSync(join(SKILLS_DIR, skill))) {
          missingSkills.push(`${agent.name}:${skill}`);
        }
      }
    }
  }
  checks.push({
    name: 'Skills exist',
    status: missingSkills.length ? 'warn' : 'pass',
    message: missingSkills.length
      ? `Missing: ${missingSkills.join(', ')}`
      : 'All skills exist',
  });

  const pass = checks.every(c => c.status !== 'fail');
  return { pass, checks };
}

function detectCycles(flow: Record<string, { next: string | null }>): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const stack = new Set<string>();

  function dfs(node: string, path: string[]): void {
    if (stack.has(node)) {
      const cycleStart = path.indexOf(node);
      cycles.push([...path.slice(cycleStart), node]);
      return;
    }
    if (visited.has(node)) return;

    visited.add(node);
    stack.add(node);
    path.push(node);

    const entry = flow[node];
    if (entry?.next) dfs(entry.next, [...path]);

    stack.delete(node);
  }

  for (const agent of Object.keys(flow)) {
    if (!visited.has(agent)) dfs(agent, []);
  }

  return cycles;
}

export function formatValidation(chain: ChainDef, result: ValidationResult): string {
  const lines = [`Chain "${chain.name}" validation:`];
  for (const check of result.checks) {
    const icon = check.status === 'pass' ? '  ✅' : check.status === 'warn' ? '  ⚠️ ' : '  ❌';
    lines.push(`${icon} ${check.message}`);
  }
  lines.push('');
  lines.push(`  ${result.pass ? 'PASS' : 'FAIL'}`);
  return lines.join('\n');
}
