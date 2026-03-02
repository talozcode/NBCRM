# NBCRM Premium MVP Plan

## 1) Repo audit summary
- Existing stack: vanilla HTML/CSS/JS SPA
- Existing modules: dashboard, sales/rentals leads, contacts, properties, tasks, settings import
- Strengths: lightweight, fast startup, no dependency complexity, easy deployment
- Weaknesses: basic visual language, limited interaction polish, no dedicated viewings module, limited detail workspaces
- Reuse: app shell pattern, local storage model, import concept, CRUD flow
- Improve: design system depth, premium UI hierarchy, kanban, detail experiences, timeline and viewing workflows

## 2) Architecture strategy (MVP-first)
- Keep the current dependency-free stack for reliability in this environment
- Structure features by domain module in code (`sales`, `rentals`, `contacts`, `inventory`, `tasks`, `viewings`, `settings`)
- Maintain a central store and activity tracking for linked history
- Prepare for future service extraction (`integration service`, `persistence service`, `ui components`)

## 3) Design system direction
- Palette: midnight navy primary, emerald secondary, amber premium accent, slate neutrals
- Typography: strong page titles, compact helper text, clear metric hierarchy
- Spacing: 8px rhythm with generous card padding
- Components: layered glass cards, gradient metric cards, chips/badges, sticky toolbars, rounded forms, polished drawer modals
- Data UI: premium tables, stage badges, kanban cards, lightweight chart-like bars
- Motion: subtle hover lift, nav slide, shimmer loading skeletons

## 4) Data model (in-browser)
- users, lead_sources, tags
- sales_leads, rental_leads
- contacts
- inventory (projects/properties)
- tasks
- viewings
- activities
- import_logs

## 5) Build phases
1. Upgrade visual system and app shell polish
2. Enhance dashboard insights and visual hierarchy
3. Add lead list+kanban + detail workspace
4. Add dedicated viewings module
5. Improve task/contact/inventory UX and linking
6. Upgrade import center and add import logs
