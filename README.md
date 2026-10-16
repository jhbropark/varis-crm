# VARIS CRM 2.1

`crm.varis.kr` / Vercel project `varis-crm` / production branch `main`.

## Scope

Static browser-local counseling workspace. **No server database, login, authorization, storage encryption, cross-PC collaboration, scheduled Sheets backup or mail statistics API.**

- `crm-core.js`: validation, multiline CSV parsing, formula-safe serialization, conservative merge and optimistic storage conflict guard.
- `app.js`: kanban, form validation, display masking, JSON/CSV export, mandatory restore preview and cross-tab change alerts.
- `styles.css`: mobile/desktop layout and keyboard focus.
- `vercel.json`: CSP, frame denial, MIME protection, no-referrer, noindex. Only generated `public/` assets are deployed.

## Development

```sh
npm ci
npm test
npm run build
npm run dev
npm run test:browser # installed Chrome; local QA server at 127.0.0.1:8769
```

Fixtures must use `example.invalid` and synthetic numbers. No real contacts or credentials in tests or commits.

## Preservation and backup

Existing browser data stays at `localStorage.varis_crm_v1`. No automatic seeding or clearing. Corrupt/unreadable data blocks writes, without replacing the original. Existing v2 samples are not automatically removed.

JSON v3 preserves IDs, dates, stages and timestamped notes; tokens are excluded. Legacy v2 imports records but not token settings. Basic CSV adds ID/date/notes columns. Unified 21-column CSV is a lossy contact copy, not full recovery. Formula-like CSV cells are apostrophe-prefixed. Prefer JSON for exact recovery.

Restore always previews additions/supplements/conflicts. Nonempty existing values and stages are preserved. Same ID or a unique phone/email match with no contradictory identity may supplement blank fields/notes. Conflicts never silently overwrite values; names alone are never matching keys.

Download requests, user-entered Sheets acknowledgment and actual verified backup are distinct. The app does not verify downloads or Sheets writes. Browser concurrency guards are optimistic, not distributed locks.

Owner-designated [VARIS contact backup Sheet](https://docs.google.com/spreadsheets/d/15Wr_Vu38Ccqj1g_qxX3dhArvVBkc2iuY5G-Km-M-Q3o/edit) is linked only. Use a separate tab, never replace source/contact tabs. No sharing changes or automatic Sheets writes are made.

Before migrations, export JSON. Vercel rollback changes app assets only, not browser keys; v2 can still read the applicant array.

## Mail and next gate

The production `/api/stats` returned HTTP 404. The broken manual-token fetch UI is replaced with an explicit unavailable state and links to existing dashboards. No email dispatch occurs here. Institution outreach remains on recipient-by-recipient `sender.py` only.

See `UPDATE-STRATEGY.md` for server-auth/database migration gates. Do not claim collaboration readiness before authentication, authorization, RLS, migration and backup restore drills pass.
