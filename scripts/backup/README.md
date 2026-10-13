# Backups (Supabase Free has none)

Stopgap until the project moves to Supabase Pro (daily backups, 7 days).

## What runs
- Windows Task Scheduler task **"MM Bags weekly backup"** — Fridays 21:00, or as
  soon as the PC is on if that time was missed. It runs `run-backup.cmd`.
- Output: `%USERPROFILE%\MM-Bags-Backups\`
  - `YYYY-MM-DD_HHmm/` — one JSON file per table, `_auth_users.json`, `_manifest.json`
  - `storage/` — product images, review photos and videos (incremental: unchanged files are not re-downloaded, so Supabase egress stays low)
  - `backup.log` — every run, with its exit code
- The newest 8 snapshots are kept.

The backups contain customer data. **Never** put them in a git repository: this repo
is public, and the script refuses to write inside any git repo.

## Run it by hand
```
node scripts/backup/export-data.mjs            # default folder
node scripts/backup/export-data.mjs D:\safe   # elsewhere (not inside a git repo)
```

## Restore
The schema is in `supabase/migrations/`. Data is restored table by table. Do parents
before children: `collections`, `products`, `product_variants`, `orders`, `order_items`, then the rest.
```
node scripts/backup/restore-table.mjs "%USERPROFILE%\MM-Bags-Backups\<snapshot>" products            # dry run
node scripts/backup/restore-table.mjs "%USERPROFILE%\MM-Bags-Backups\<snapshot>" products --confirm  # write
```
The restore upserts by `id` and never deletes live rows. Auth users and storage files
must be restored manually (re-upload the `storage/` folder through the Supabase dashboard).

## Turn it off
`Unregister-ScheduledTask -TaskName "MM Bags weekly backup"` (PowerShell).
