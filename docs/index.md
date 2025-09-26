---
layout: home
title: Agent SDK Docs
nav_order: 1
---

# Agent SDK

A lightweight, message-first agent loop with optional planning, summarization, and multi-agent orchestration. These docs walk through installation, architecture, and capability-oriented guides.

## Key capabilities

- Planning mode with a structured TODO tool and strict workflow rules.
- Token-aware context summarization that archives heavy tool outputs while keeping them recoverable via `get_tool_response`.
- Structured output finalization powered by Zod schemas.
- Tool limits (total + parallel) with automatic finalize messaging.
- Agent composition via `asTool` and runtime handoffs.
- Vision-friendly message parts and provider usage normalization.
- Rich Markdown debug logs and streaming `onEvent` hooks.

## Start here

- **[Getting Started](getting-started/)** – Installation, first agent, and environment setup.
- **[Core Concepts](core-concepts/)** – State, nodes, tools, events, and planning basics.
- **[Architecture](architecture/)** – Loop phases, decision heuristics, and summarization flow.

## Documentation map

Foundations
- [Getting Started](getting-started/) – Install, createAgent vs createSmartAgent, and quick tours.
- [Core Concepts](core-concepts/) – Mental model of state, nodes, planning, and events.
- [Architecture](architecture/) – Detailed flow, decision factories, and design trade-offs.

API & Building Blocks
- [API](api/) – Exported factories, adapters, and key option types.
- [Nodes](nodes/) – Breakdown of resolver, agent, tools, summarization, and finalize nodes.
- [Tools](tools/) – Authoring tools with Zod and plugging in LangChain or MCP tools.
- [Prompts](prompts/) – System prompt construction and planning rules.
- [Structured Output](structured-output/) – Finalize tool workflow, parsing, and recovery options.
- [Tool Development](tool-development/) – Advanced authoring patterns and safeguards.

Capabilities & Operations
- [Limits & Tokens](limits-tokens/) – Token heuristics, summarization knobs, and limit trade-offs.
- [Debugging](debugging/) – Markdown logs, callbacks, and recommended debug flows.
- [Examples](examples/) – Capability matrix mapped to example folders.
- [FAQ](faq/) – Common issues, tips, and integration notes.

## Example coverage

| Folder | Capability | Highlights |
|--------|------------|------------|
| `basic` | Base agent loop | Minimal tool call run with a real model. |
| `tools` | Multiple tools + events | Tavily search integration, `onEvent` logging. |
| `todo-planning` | Planning discipline | Enforced TODO updates with `useTodoList`. |
| `tool-limit` | Tool cap + finalize | Shows injected finalize system notice. |
| `summarization` | Token threshold | Demonstrates summarization triggers. |
| `summarize-context` | Summary + retrieval | Uses `get_tool_response` to fetch archived data. |
| `rewrite-summary` | Continue after summaries | Works with summarized history in follow-up turns. |
| `structured-output` | Schema finalize | Parses JSON into typed outputs. |
| `multi-agent` | Agent-as-tool | Delegation via `agent.asTool`. |
| `handoff` | Runtime handoff | Transfers control between agents. |
| `mcp-tavily` | MCP tools | Demonstrates remote MCP tool usage. |
| `vision` | Multimodal input | Sends text + image parts through the adapter. |

## Design principles

- **Minimal surface** – no external graph runtime; explicit while-loop orchestration.
- **Developer-first** – predictable events, inspection-ready state, and rich logs.
- **Flexible adapters** – bring any model that implements `invoke`; LangChain is optional.
- **Observable by default** – usage normalization, plan events, and Markdown traces.

> Tip: open an example folder, run it locally, and then explore the related docs section for deeper background.

Use the left sidebar or search to navigate the full documentation set.
