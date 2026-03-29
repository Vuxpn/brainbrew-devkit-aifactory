import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Brainbrew Devkit',
  description: 'Agent pipelines that fix themselves',
  base: '/brainbrew-devkit/',

  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Skills', link: '/skills/' },
      { text: 'Agents', link: '/agents/' },
      { text: 'Templates', link: '/templates/' },
      { text: 'API', link: '/api/mcp-tools' }
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/guide/' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Quick Start', link: '/guide/quick-start' }
          ]
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Chain Workflow', link: '/guide/chain-workflow' },
            { text: 'Memory Bus', link: '/guide/memory-bus' },
            { text: 'Agent Teams', link: '/guide/agent-teams' }
          ]
        },
        {
          text: 'Customization',
          items: [
            { text: 'Custom Agents', link: '/guide/custom-agents' },
            { text: 'Custom Skills', link: '/guide/custom-skills' },
            { text: 'Custom Hooks', link: '/guide/custom-hooks' }
          ]
        }
      ],
      '/skills/': [
        {
          text: 'Skills Reference',
          items: [
            { text: 'Overview', link: '/skills/' },
            { text: 'chain-builder', link: '/skills/chain-builder' },
            { text: 'memory', link: '/skills/memory' },
            { text: 'skill-creator', link: '/skills/skill-creator' },
            { text: 'skill-improver', link: '/skills/skill-improver' },
            { text: 'skill-finder', link: '/skills/skill-finder' },
            { text: 'agent-improver', link: '/skills/agent-improver' }
          ]
        }
      ],
      '/agents/': [
        {
          text: 'Agents Reference',
          items: [
            { text: 'Overview', link: '/agents/' }
          ]
        }
      ],
      '/templates/': [
        {
          text: 'Templates',
          items: [
            { text: 'Overview', link: '/templates/' },
            { text: 'develop', link: '/templates/develop' },
            { text: 'devops', link: '/templates/devops' },
            { text: 'marketing', link: '/templates/marketing' },
            { text: 'research', link: '/templates/research' },
            { text: 'docs', link: '/templates/docs' },
            { text: 'support', link: '/templates/support' },
            { text: 'data', link: '/templates/data' },
            { text: 'moderation', link: '/templates/moderation' },
            { text: 'review', link: '/templates/review' },
            { text: 'minimal', link: '/templates/minimal' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'MCP Tools', link: '/api/mcp-tools' },
            { text: 'Hooks', link: '/api/hooks' }
          ]
        }
      ]
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/brainbrewlabs/brainbrew-devkit' }
    ],
    search: {
      provider: 'local'
    },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright 2025 Brainbrew Labs'
    }
  }
})
