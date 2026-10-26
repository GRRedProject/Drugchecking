# StreetCheck findings dashboard

A GitHub Pages site with two views of StreetCheck drug-checking results: xylazine and medetomidine trends over time, and a searchable sample explorer with individual record details.

The trend charts count FTIR substance descriptions that mention each substance. The line shows that count as a share of all samples acquired in the same month. The bars use the left axis and the share line uses the right axis.

## Public site

After the GitHub Pages workflow completes, the dashboard is available at:

`https://hermandvbang.github.io/Drugchecking/`

## Refresh the published snapshot

When new results are in the local PostgreSQL database, open PowerShell in this folder and run:

```powershell
.\.venv\Scripts\python.exe publish_data.py
```

The script exports only the approved analysis fields, updates `data/records.json`, and pushes that file to GitHub. GitHub Actions then updates the website. Database access must already be configured in the local `.pgpass` file; that file is ignored by Git and stays on this computer.

## Data privacy boundary

The export API in `server.py` uses an explicit field allowlist. It does **not** send names, emails, phones, sample IDs, collector/group details, flags, or free-text narratives/notes to the browser. The published snapshot contains the approved analytical fields only; credentials are never stored in this repository.

This dashboard is for exploratory harm-reduction insight and is not a clinical, forensic, or individual-identification tool.
