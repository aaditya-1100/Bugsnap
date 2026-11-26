# BugSnap — Product Specification

## Vision

BugSnap is a lightweight visual bug reporting SaaS that turns "I found a bug" into a fully structured, actionable report in seconds.

## Target Users

- **Indie developers** who want fast visual bug tracking without heavyweight tools.
- **Small teams (2-15)** needing a shared bug reporting workflow.
- **Agencies** managing bugs across multiple client projects.

## Core Workflow

1. **Capture** — Chrome extension takes a screenshot of the current page, automatically collecting URL, viewport, browser info, and console errors.
2. **Annotate** — User draws arrows, boxes, highlights, and blur regions directly on the screenshot using a Fabric.js canvas.
3. **Describe** — User fills in a quick description; AI (Gemini) generates structured bug report fields (title, steps to reproduce, expected vs observed behavior, severity).
4. **Report** — Bug report is saved to the workspace, shared via link, and optionally exported as a GitHub Issue.

## Key Concepts

| Concept | Description |
|---------|-------------|
| Workspace | Top-level container. One user can own multiple workspaces. |
| Project | A tracked website/app within a workspace. |
| Report | A single bug report with screenshots, annotations, and metadata. |
| Member | A user invited to a workspace with Admin or Member role. |

## Status Flow

`New` → `Triaged` → `In Progress` → `Resolved` → `Closed`

## Severity Levels

`Critical` · `High` · `Medium` · `Low` · `Unknown`

## Non-Goals (V1)

- Native mobile app
- Duplicate bug detection
- Video recording
- Real-time collaboration on reports
- Self-hosted option
