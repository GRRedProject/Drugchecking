"""Refresh the public snapshot and publish it to the GitHub Pages site."""

import json
import subprocess
import sys
from pathlib import Path

from server import fetch_safe_records


ROOT = Path(__file__).resolve().parent
SNAPSHOT = ROOT / "data" / "records.json"


def git(*args, capture_output=False):
    return subprocess.run(
        ["git", *args],
        cwd=ROOT,
        check=True,
        text=True,
        capture_output=capture_output,
    )


def main():
    # Avoid bundling any unrelated changes the user may already have staged.
    staged_check = subprocess.run(
        ["git", "diff", "--cached", "--quiet"], cwd=ROOT, check=False
    )
    if staged_check.returncode == 1:
        print("There are already staged Git changes. Commit or unstage them, then retry.")
        return 1
    if staged_check.returncode > 1:
        print("Could not inspect Git status.")
        return staged_check.returncode

    print("Reading approved analysis fields from the local database...")
    records = fetch_safe_records()
    SNAPSHOT.parent.mkdir(exist_ok=True)
    SNAPSHOT.write_text(
        json.dumps({"records": records}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    status = git("status", "--short", "--", "data/records.json", capture_output=True)
    if not status.stdout.strip():
        print("The published data is already up to date. Nothing to push.")
        return 0

    branch = git("branch", "--show-current", capture_output=True).stdout.strip()
    if not branch:
        print("Could not determine the current Git branch.")
        return 1

    git("add", "--", "data/records.json")
    git("commit", "-m", "Refresh published sample data")
    print(f"Pushing the data update from branch {branch}...")
    git("push", "origin", branch)
    print("Done. GitHub Actions will publish the updated website shortly.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, subprocess.CalledProcessError, ValueError) as error:
        print(f"Could not publish the data: {error}")
        sys.exit(1)
