#!/usr/bin/env python3
"""
fetch_garmin.py — syncs Garmin Connect activities as FIT files into imports/

Setup:
    pip install garminconnect
    export GARMIN_EMAIL="your@email.com"
    export GARMIN_PASSWORD="yourPassword"

Usage:
    python3 fetch_garmin.py              # last 7 days
    python3 fetch_garmin.py --days 30    # last 30 days
    python3 fetch_garmin.py --all        # all not yet synced
"""
import os
import json
import sys
import argparse
import zipfile
import io
from datetime import datetime, date, timedelta
from pathlib import Path
from typing import Optional

try:
    from garminconnect import Garmin, GarminConnectAuthenticationError
except ImportError:
    print("Error: garminconnect not installed.")
    print("Please run: pip install garminconnect")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BASE_DIR    = Path(__file__).parent
IMPORTS_DIR = BASE_DIR / "imports"
STATE_FILE  = BASE_DIR / ".garmin_sync_state.json"

# Activity types to skip (manually tracked)
SKIP_TYPES = {"other"}

# Garmin activity type → subfolder under imports/
ACTIVITY_FOLDER_MAP = {
    "running":             "running",
    "trail_running":       "running",
    "treadmill_running":   "running",
    "indoor_running":      "running",
    "swimming":            "swimming",
    "lap_swimming":        "swimming",
    "open_water_swimming": "swimming",
    "cycling":             "cycling",
    "road_biking":         "cycling",
    "indoor_cycling":      "cycling",
    "strength_training":   "strength",
    "fitness_equipment":   "strength",
    "indoor_rowing":       "strength",
    "weight_training":     "strength",
}
DEFAULT_FOLDER = "other"

# Activity type → short label for filename
ACTIVITY_LABEL_MAP = {
    "running":             "run",
    "trail_running":       "trail",
    "treadmill_running":   "treadmill",
    "indoor_running":      "run-indoor",
    "swimming":            "swim",
    "lap_swimming":        "swim",
    "open_water_swimming": "swim-ow",
    "cycling":             "ride",
    "road_biking":         "ride",
    "indoor_cycling":      "ride-indoor",
    "strength_training":   "strength",
    "fitness_equipment":   "strength",
    "indoor_rowing":       "row",
    "weight_training":     "strength",
}

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def load_state() -> dict:
    """Load sync state (already downloaded activity IDs)."""
    if STATE_FILE.exists():
        with open(STATE_FILE, "r") as f:
            return json.load(f)
    return {"downloaded_ids": []}


def save_state(state: dict):
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)


def get_folder(activity_type: str) -> Path:
    folder_name = ACTIVITY_FOLDER_MAP.get(activity_type.lower(), DEFAULT_FOLDER)
    folder = IMPORTS_DIR / folder_name
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def get_label(activity_type: str) -> str:
    return ACTIVITY_LABEL_MAP.get(activity_type.lower(), activity_type.lower().replace(" ", "-"))


def build_filename(activity: dict) -> str:
    """Build filename in the format YYYY-MM-DD_type_ID.fit"""
    raw_date = activity.get("startTimeLocal", "")[:10]
    activity_type = activity.get("activityType", {}).get("typeKey", "activity")
    label = get_label(activity_type)
    activity_id = activity.get("activityId", "unknown")
    return f"{raw_date}_{label}_{activity_id}.fit"


def extract_fit_from_zip(zip_bytes: bytes) -> Optional[bytes]:
    """Extract the .fit file from a Garmin ZIP download."""
    try:
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            for name in zf.namelist():
                if name.lower().endswith(".fit"):
                    return zf.read(name)
    except Exception:
        pass
    return None

# ---------------------------------------------------------------------------
# Main logic
# ---------------------------------------------------------------------------

def sync(days: int = 7, sync_all: bool = False):
    email    = os.environ.get("GARMIN_EMAIL")
    password = os.environ.get("GARMIN_PASSWORD")

    if not email or not password:
        print("Error: environment variables missing.")
        print("  export GARMIN_EMAIL='your@email.com'")
        print("  export GARMIN_PASSWORD='yourPassword'")
        sys.exit(1)

    print("Connecting to Garmin Connect...")
    try:
        api = Garmin(email, password)
        api.login()
    except GarminConnectAuthenticationError:
        print("Error: login failed — check email or password.")
        sys.exit(1)
    except Exception as e:
        print(f"Login error: {e}")
        sys.exit(1)

    print("Login successful.")

    state = load_state()
    already_downloaded = set(str(i) for i in state.get("downloaded_ids", []))

    # Fetch activity list
    limit = 100 if sync_all else min(days * 2, 50)
    print(f"Fetching activity list (max {limit})...")
    activities = api.get_activities(0, limit)

    # Date filter
    if not sync_all:
        cutoff = date.today() - timedelta(days=days)
        activities = [
            a for a in activities
            if a.get("startTimeLocal", "")[:10] >= cutoff.isoformat()
        ]

    # Only new activities
    new_activities = [
        a for a in activities
        if str(a.get("activityId")) not in already_downloaded
    ]

    if not new_activities:
        print("No new activities found.")
        return

    print(f"{len(new_activities)} new activity/activities found.\n")

    downloaded = 0
    for activity in new_activities:
        activity_id   = activity.get("activityId")
        activity_type = activity.get("activityType", {}).get("typeKey", "other")
        raw_date      = activity.get("startTimeLocal", "")[:10]
        name          = activity.get("activityName", "Unknown")
        duration_s    = int(activity.get("duration", 0))
        duration_min  = duration_s // 60

        if activity_type in SKIP_TYPES:
            print(f"  [{raw_date}] {name} ({activity_type}) — skipped")
            already_downloaded.add(str(activity_id))
            continue

        folder   = get_folder(activity_type)
        filename = build_filename(activity)
        dest     = folder / filename

        print(f"  [{raw_date}] {name} ({activity_type}, {duration_min} min)")

        try:
            zip_data = api.download_activity(
                activity_id,
                dl_fmt=Garmin.ActivityDownloadFormat.ORIGINAL
            )
            fit_data = extract_fit_from_zip(zip_data)

            if fit_data:
                dest.write_bytes(fit_data)
                print(f"    → saved: {dest.relative_to(BASE_DIR)}")
            else:
                # Fallback: save the ZIP directly
                dest_zip = dest.with_suffix(".zip")
                dest_zip.write_bytes(zip_data)
                print(f"    → saved as ZIP: {dest_zip.relative_to(BASE_DIR)}")

            already_downloaded.add(str(activity_id))
            downloaded += 1

        except Exception as e:
            print(f"    Download error: {e}")

    # Persist state
    state["downloaded_ids"] = list(already_downloaded)
    state["last_sync"] = datetime.now().isoformat()
    save_state(state)

    print(f"\nDone: {downloaded}/{len(new_activities)} activities downloaded.")
    print(f"Files are in: {IMPORTS_DIR.relative_to(BASE_DIR.parent)}/")

# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Garmin → imports/ sync")
    parser.add_argument("--days", type=int, default=7,
                        help="Activities from the last N days (default: 7)")
    parser.add_argument("--all", dest="sync_all", action="store_true",
                        help="Download all not-yet-synced activities")
    args = parser.parse_args()

    sync(days=args.days, sync_all=args.sync_all)
