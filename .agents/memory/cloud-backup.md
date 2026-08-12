---
name: Cloud backup architecture
description: How the cloud backup/restore system works for IslandCity Driver Accounting
---

# Cloud Backup Architecture

## Rule
The app has two storage layers: localStorage (fast, on-device) + PostgreSQL via API server (durable, cloud). The cloud backup is best-effort and always fires silently.

**Why:** localStorage is ephemeral on iOS — Safari clears it when low on storage. A cloud layer makes data survive reinstalls and device switches.

## How to apply
- `driver_backups` table in PostgreSQL holds full snapshots (trips, expenses, hoursLog, settings as JSONB).
- Rolling window: last 48 backups kept; older ones deleted automatically on each save.
- API: `POST /api/backup` (save), `GET /api/backup/latest` (restore), `GET /api/backup/list` (history).
- Frontend: `saveCloudBackup` is a `useCallback` with empty deps — reads from refs (`tripsRef`, `expensesRef`, `hoursLogRef`) so it always has current data without stale closure issues.
- Auto triggers: 60-min `setInterval`, `visibilitychange` → hidden, END SHIFT (after 800ms delay for hoursLog state to settle).
- Auto-restore on mount: if `island-city-trips` localStorage is empty, fetch `/api/backup/latest` and restore all data + settings.
- `cloudBackupAt` state persisted to `ic-last-cloud-backup` localStorage so the settings panel shows the correct timestamp on reload.
