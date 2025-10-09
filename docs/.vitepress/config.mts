import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Agent SDK',
  description: 'A lightweight, message-first agent loop with planning, summarization, and multi-agent orchestration',
  base: '/agent-sdk/',
  ignoreDeadLinks: true,
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API Reference', link: '/api/agent' },
      { text: 'Examples', link: '/examples/' },
      {
        text: 'v0.1.1',
        items: [
          { text: 'Changelog', link: '/changelog' },
          { text: 'Contributing', link: '/contributing' },
        ],
      },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Core Concepts', link: '/guide/core-concepts' },
            { text: 'Architecture', link: '/guide/architecture' },
          ],
        },
        {
          text: 'Features',
          items: [
            { text: 'Planning & TODOs', link: '/guide/planning' },
            { text: 'Tool Development', link: '/guide/tool-development' },
            { text: 'Guardrails', link: '/guide/guardrails' },
            { text: 'State Management', link: '/guide/state-management' },
            { text: 'Structured Output', link: '/guide/structured-output' },
            { text: 'Tool Approvals', link: '/guide/tool-approvals' },
            { text: 'MCP Integration', link: '/guide/mcp' },
          ],
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Limits & Tokens', link: '/guide/limits-tokens' },
            { text: 'Debugging & Tracing', link: '/guide/debugging' },
            { text: 'FAQ', link: '/guide/faq' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Agent', link: '/api/agent' },
            { text: 'Tools', link: '/api/tools' },
            { text: 'Nodes', link: '/api/nodes' },
            { text: 'Prompts', link: '/api/prompts' },
            { text: 'Adapters', link: '/api/adapters' },
            { text: 'Types', link: '/api/types' },
          ],
        },
      ],
      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Overview', link: '/examples/' },
            { text: 'Basic Agent', link: '/examples/basic' },
            { text: 'Planning & TODOs', link: '/examples/planning' },
            { text: 'Multi-Agent', link: '/examples/multi-agent' },
            { text: 'Tool Approval', link: '/examples/tool-approval' },
            { text: 'Structured Output', link: '/examples/structured-output' },
            { text: 'Guardrails', link: '/examples/guardrails' },
            { text: 'Pause & Resume', link: '/examples/pause-resume' },
            { text: 'Vision', link: '/examples/vision' },
            { text: 'MCP Tools', link: '/examples/mcp' },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/Cognipeer/agent-sdk' },
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025 CognipeerAI',
    },
    search: {
      provider: 'local',
    },
  },
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/agent-sdk/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#3eaf7c' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:locale', content: 'en' }],
    ['meta', { name: 'og:site_name', content: 'Agent SDK Documentation' }],
  ],
});
