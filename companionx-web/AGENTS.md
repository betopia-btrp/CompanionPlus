<!-- BEGIN:nextjs-agent-rules -->
# Next.js 16: Read bundled docs before coding

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

Key differences in this version:
- Turbopack is default (use `--webpack` flag to opt out)
- `middleware` is deprecated → rename to `proxy`
- `params` and `searchParams` are async (must `await`)
- `cookies()`, `headers()`, `draftMode()` are async only
- `cacheLife`, `cacheTag` are stable (no `unstable_` prefix)
- `revalidateTag` requires second argument (cacheLife profile)
- `next lint` removed — use ESLint directly
- `next/legacy/image` deprecated — use `next/image`
- `serverRuntimeConfig` removed — use env vars
- `images.domains` deprecated — use `images.remotePatterns`
- `after()` from `next/server` for non-blocking operations
- Parallel routes require explicit `default.js` files
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:vercel-react-best-practices -->
# Vercel React Best Practices

This project includes the Vercel React Best Practices guide at `.agents/skills/vercel-react-best-practices/`. The key rules organized by impact:

**CRITICAL** — Eliminating Waterfalls & Bundle Size:
- Use `Promise.all()` for independent async operations, not sequential awaits
- Start promises early, `await` late in API routes and server actions
- Use Suspense boundaries to stream content instead of blocking renders
- Import directly from libraries (Next.js handles barrel optimization)
- Use `next/dynamic` for heavy components not needed on initial render

**HIGH** — Server-Side Performance:
- Always authenticate inside Server Actions (they're public endpoints)
- Use `React.cache()` for per-request deduplication of DB queries
- Hoist static I/O (fonts, logos, config) to module level
- Minimize data passed across RSC → client boundaries
- Restructure components to parallelize data fetching

**MEDIUM** — Re-renders & Client Fetching:
- Derive state during render, not in effects
- Use functional `setState` for stable callbacks
- Pass lazy initializer to `useState` for expensive values
- Use SWR for automatic request deduplication on client
- Don't define components inside other components

The full guide with 70+ rules and examples: `.agents/skills/vercel-react-best-practices/AGENTS.md`
For rule-by-rule breakdown: `rules/` directory in that folder
<!-- END:vercel-react-best-practices -->
