# Changelog

All significant codebase changes are documented here.

---

## 2026-04-04 — Branching & Environment Setup

**What changed:**
- Created `demo` branch as a frozen snapshot of the current demo
- Created `dev` and `staging` branches from `main`
- `main` is now the production branch (Vercel production)
- Cleaned up broken `main 2` git ref

**Branching strategy:**
| Branch | Purpose | Deploys to |
|---|---|---|
| `demo` | Frozen demo snapshot | GitHub Pages |
| `dev` | Active development | Vercel preview |
| `staging` | Pre-production review | Vercel preview |
| `main` | Published production | Vercel production |

**Promotion flow:** `feature branches -> dev -> staging -> main`

**Why:** Needed to preserve the demo while building out the real product. Vercel handles multi-environment deployments natively.
