# StreetCheck findings dashboard

A GitHub Pages site with three views: xylazine and medetomidine trends over time, a searchable sample explorer with individual record details, and a resources page for West Michigan harm reduction, drug checking, naloxone, treatment, and support.

The trend charts count FTIR substance descriptions that mention each substance. The line shows that count as a share of all samples acquired in the same month. The bars use the left axis and the share line uses the right axis.

## Public site

After the GitHub Pages workflow completes, the dashboard is available at:

`https://grredproject.github.io/Drugchecking/`

## Refresh the published snapshot

When new results are in the local PostgreSQL database, double-click **Update Website Data.bat** in this folder. It refreshes the approved snapshot and pushes it to GitHub; GitHub Actions then updates the website. Leave the window open until it says the publish is done.

You can also run it from PowerShell:

```powershell
.\.venv\Scripts\python.exe publish_data.py
```

The publisher exports only the approved analysis fields and skips exact duplicate records. Rows that share a lab code but differ in dates or results are kept. Database access must already be configured in the local `.pgpass` file; that file is ignored by Git and stays on this computer.

## Data privacy boundary

The export API in `server.py` uses an explicit field allowlist. It does **not** send names, emails, phones, sample IDs, collector/group details, flags, or general free-text narratives to the browser. It includes only the notes attached to specific test-strip results, alongside the approved analytical fields; credentials are never stored in this repository.

This dashboard is for exploratory harm-reduction insight and is not a clinical, forensic, or individual-identification tool.
