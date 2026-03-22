import { defineConfig } from 'tsup';

export default defineConfig([
  // CLI entry
  {
    entry: ['src/cli.ts'],
    format: ['esm'],
    outDir: 'dist',
    banner: { js: '#!/usr/bin/env node' },
    clean: true,
    sourcemap: false,
    minify: false,
    splitting: false,
    noExternal: [/.*/],
  },
  // Hook entries → plugin/scripts/ for Claude Code plugin
  {
    entry: {
      'runner': 'src/hooks/runner.ts',
      'post-agent': 'src/hooks/post-agent.ts',
      'subagent-start': 'src/hooks/subagent-start.ts',
      'subagent-stop': 'src/hooks/subagent-stop.ts',
      'session-end': 'src/hooks/session-end.ts',
    },
    format: ['cjs'],
    outDir: 'plugin/scripts',
    sourcemap: false,
    minify: false,
    splitting: false,
    noExternal: [/.*/],
  },
]);
