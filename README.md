# NBCRM Premium MVP

A premium, modern real-estate CRM MVP designed for daily internal operations.

## Current stack
- Vanilla HTML/CSS/JavaScript SPA
- localStorage persistence
- CSV import workflow for Google Forms -> Google Sheets responses

> Why this stack now: repository started empty and package installation was blocked in this environment; this implementation stays dependency-free while delivering a polished, investor-ready MVP UI and practical workflows.

## Implemented modules
- Command-center dashboard with KPI cards, pipeline visual bars, source mix, recent activity, upcoming viewings, and hot lead visibility
- Sales leads module with list + kanban views, search, priority, tags, stage flow, detail workspace, and quick edits
- Rental leads module with parallel pipeline behavior and detail workspace
- Contacts relationship hub with duplicate prevention and rich contact fields
- Projects/properties inventory management
- Follow-up tasks engine with priorities, overdue visibility, and related record linkage
- Dedicated appointments/viewings module
- Activity timeline tracking across entities
- Settings/import center with Google Sheets CSV mapping, duplicate skipping, source tagging, and import logs

## Run locally
```bash
python3 -m http.server 4173
# open http://localhost:4173
```

## Google integration (MVP now)
1. Google Form responses feed a Google Sheet.
2. Export sheet as CSV.
3. Paste CSV in Settings -> Import Center.
4. Map columns and import into Sales or Rentals.

## Recommended production path (next)
- Backend sync service using Google Sheets API + checkpointing (last row / timestamp)
- Direct web form ingestion endpoint into CRM API
- Optional Meta Lead Ads connector
- Server-side dedupe and import observability pipeline

## Fly.io auto-deploy (GitHub Actions)
This repo includes `.github/workflows/fly-deploy.yml` for automatic deploys on pushes to `main`.

Required GitHub repository secrets:
- `FLY_API_TOKEN` (Fly access token)
- `FLY_APP_NAME` (your Fly application name)

The workflow runs `flyctl deploy --remote-only --app $FLY_APP_NAME` and uses the included `Dockerfile` to serve this static SPA with Nginx.

