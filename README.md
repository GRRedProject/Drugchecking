# StreetCheck findings dashboard

A GitHub Pages site with two views of StreetCheck drug-checking results: xylazine and medetomidine trends over time, and a searchable sample explorer with individual record details.

The trend charts count FTIR substance descriptions that mention each substance. The line shows that count as a share of all samples acquired in the same month. The bars use the left axis and the share line uses the right axis.

## Public site

After the GitHub Pages workflow completes, the dashboard is available at:

`https://hermandvbang.github.io/Drugchecking/`

## Refresh the published snapshot

1. Create a local `.pgpass` file in this folder (it is ignored by Git):

   ```text
   localhost:5432:*:postgres:YOUR_PASSWORD
   ```

2. Start the local server:

   ```powershell
   .\.venv\Scripts\python.exe server.py
   ```

3. In a second PowerShell window, retrieve the allowlisted record snapshot:

   ```powershell
   Invoke-WebRequest http://127.0.0.1:8000/api/records -OutFile data\records.json
   ```

4. Commit and push `data/records.json`. GitHub Actions deploys the static site automatically.

If port 8000 is in use, run this before starting the server:

```powershell
$env:PORT = '8001'
```

## Data privacy boundary

The export API in `server.py` uses an explicit field allowlist. It does **not** send names, emails, phones, sample IDs, collector/group details, flags, or free-text narratives/notes to the browser. The published snapshot contains the approved analytical fields only; credentials are never stored in this repository.

This dashboard is for exploratory harm-reduction insight and is not a clinical, forensic, or individual-identification tool.
