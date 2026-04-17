#!/usr/bin/env python3
"""
fetch_garmin.py — pulls Garmin Connect data and writes JSON for the dashboard.

Outputs (written to ../public/data/ by default):
  activities.json   — all activities mapped to the dashboard Activity schema
  daily_stats.json  — per-day steps / HR / sleep / body-battery

Also optionally downloads raw FIT files into imports/ (use --fit flag).

Token storage:
  On first run the script asks for your MFA code and saves the session token
  to .garmin_tokens.json next to this script.  Subsequent runs load the token
  automatically — no credentials or MFA needed.

  For GitHub Actions, copy the contents of .garmin_tokens.json into a secret
  called GARMINTOKENS and add it to the workflow env.

Usage:
  python3 fetch_garmin.py              # last 365 days → JSON
  python3 fetch_garmin.py --days 30    # last 30 days → JSON
  python3 fetch_garmin.py --all        # all activities → JSON
  python3 fetch_garmin.py --fit        # also download FIT files
"""
import os
import json
import sys
import argparse
import zipfile
import io
from datetime import datetime, date, timedelta, timezone
from pathlib import Path
from typing import Optional

try:
    from garminconnect import (
        Garmin,
        GarminConnectAuthenticationError,
        GarminConnectConnectionError,
        GarminConnectTooManyRequestsError,
    )
except ImportError:
    print("Error: garminconnect not installed.")
    print("Please run: pip install garminconnect")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

BASE_DIR    = Path(__file__).parent
IMPORTS_DIR = BASE_DIR / "imports"
DATA_DIR    = BASE_DIR.parent / "public" / "data"
STATE_FILE  = BASE_DIR / ".garmin_sync_state.json"
TOKEN_FILE  = BASE_DIR / ".garmin_tokens.json"

# ---------------------------------------------------------------------------
# Sport mapping
# ---------------------------------------------------------------------------

# Garmin typeKey → dashboard SportType
SPORT_MAP = {
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

# For FIT file download: sport → subfolder
ACTIVITY_FOLDER_MAP = {
    "running":  "running",
    "swimming": "swimming",
    "cycling":  "cycling",
    "strength": "strength",
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_state() -> dict:
    if STATE_FILE.exists():
        with open(STATE_FILE) as f:
            return json.load(f)
    return {"downloaded_ids": []}


def save_state(state: dict):
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)


def extract_fit_from_zip(zip_bytes: bytes) -> Optional[bytes]:
    try:
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            for name in zf.namelist():
                if name.lower().endswith(".fit"):
                    return zf.read(name)
    except Exception:
        pass
    return None


def prompt_mfa() -> str:
    print()
    print("Garmin Connect requires two-factor authentication.")
    return input("Enter the MFA / 2FA code: ").strip()

# ---------------------------------------------------------------------------
# Login with token caching
# ---------------------------------------------------------------------------

def garmin_login() -> Garmin:
    """
    Authenticate with Garmin Connect, caching tokens to avoid repeated MFA.

    Priority:
      1. GARMINTOKENS env var  — raw JSON string (GitHub Actions)
      2. .garmin_tokens.json   — saved from a previous local run
      3. GARMIN_EMAIL + PASSWORD — full login; MFA prompted interactively
    """
    token_json = os.environ.get("GARMINTOKENS")
    if token_json:
        print("Using token from GARMINTOKENS environment variable...")
        try:
            api = Garmin()
            api.login(tokenstore=token_json)
            print("Login successful (token from env).")
            return api
        except Exception as e:
            print(f"  Token from env failed ({e}), falling back to credentials...")

    token_path = str(os.environ.get("GARMINTOKENS_PATH", TOKEN_FILE))
    email    = os.environ.get("GARMIN_EMAIL", "")
    password = os.environ.get("GARMIN_PASSWORD", "")

    if Path(token_path).exists():
        print(f"Loading saved token from {token_path}...")
        try:
            api = Garmin(email, password, prompt_mfa=prompt_mfa)
            api.login(tokenstore=token_path)
            print("Login successful (saved token).")
            return api
        except Exception as e:
            print(f"  Saved token failed ({e}), re-authenticating...")

    if not email or not password:
        print("Error: no saved token and GARMIN_EMAIL / GARMIN_PASSWORD not set.")
        print(f"  Token file expected at: {TOKEN_FILE}")
        sys.exit(1)

    print("Connecting to Garmin Connect (full login)...")
    try:
        api = Garmin(email, password, prompt_mfa=prompt_mfa)
        api.login(tokenstore=token_path)
        print(f"Login successful. Token saved to {token_path}")
        return api
    except GarminConnectAuthenticationError:
        print("Error: login failed — check email/password or MFA code.")
        sys.exit(1)
    except GarminConnectTooManyRequestsError:
        print("Error: too many login attempts. Wait a few minutes and try again.")
        sys.exit(1)
    except (GarminConnectConnectionError, Exception) as e:
        print(f"Login error: {e}")
        sys.exit(1)

# ---------------------------------------------------------------------------
# Activity → dashboard JSON mapping
# ---------------------------------------------------------------------------

def map_activity(raw: dict) -> Optional[dict]:
    """Convert a Garmin activity dict to the dashboard Activity schema."""
    type_key = (raw.get("activityType") or {}).get("typeKey", "")
    sport = SPORT_MAP.get(type_key)
    if not sport:
        return None  # ignore unknown/unsupported types

    activity_id = str(raw.get("activityId", ""))
    start_time  = raw.get("startTimeGMT") or raw.get("startTimeLocal") or ""
    # Normalise to ISO-8601 (replace space with T)
    start_time = start_time.replace(" ", "T")
    if start_time and len(start_time) == 19:
        start_time += "Z"

    duration_s  = float(raw.get("duration", 0) or 0)
    distance_m  = float(raw.get("distance", 0) or 0)
    avg_hr      = raw.get("averageHR")
    max_hr      = raw.get("maxHR")
    avg_speed   = float(raw.get("averageSpeed", 0) or 0)  # m/s
    elev_gain   = raw.get("elevationGain")
    calories    = raw.get("calories")
    vo2max      = raw.get("vO2MaxValue")
    training_fx = raw.get("aerobicTrainingEffect")
    name        = raw.get("activityName") or type_key.replace("_", " ").title()

    # Cadence: running uses avgRunCadence, cycling uses averageBikingCadenceInRevPerMin
    cadence = raw.get("avgRunCadence") or raw.get("averageBikingCadenceInRevPerMin")

    # Pace / speed derived from averageSpeed (m/s)
    avg_pace = None
    avg_speed_kmh = None
    avg_power = raw.get("avgPower") or raw.get("averagePower")
    if sport in ("running", "swimming") and avg_speed > 0:
        avg_pace = round(1000 / avg_speed)   # sec per km
    elif sport == "cycling" and avg_speed > 0:
        avg_speed_kmh = round(avg_speed * 3.6, 2)

    return {
        "id": activity_id,
        "sport": sport,
        "startTime": start_time,
        "durationSeconds": round(duration_s),
        "distanceMeters": round(distance_m),
        "avgHeartRate": int(avg_hr) if avg_hr else None,
        "maxHeartRate": int(max_hr) if max_hr else None,
        "avgPaceSecPerKm": avg_pace,
        "avgSpeedKmh": avg_speed_kmh,
        "avgPowerWatts": round(float(avg_power)) if avg_power else None,
        "avgCadence": round(float(cadence)) if cadence else None,
        "elevationGainMeters": round(float(elev_gain)) if elev_gain else None,
        "vo2maxEstimate": round(float(vo2max), 1) if vo2max else None,
        "trainingEffect": round(float(training_fx), 1) if training_fx else None,
        "calories": round(float(calories)) if calories else None,
        "laps": [],
        "name": name,
        "notes": None,
        "brickGroupId": None,
    }

# ---------------------------------------------------------------------------
# Daily stats → dashboard JSON mapping
# ---------------------------------------------------------------------------

def fetch_daily_stats(api: Garmin, days: int) -> list[dict]:
    """Fetch per-day wellness stats for the last `days` days."""
    stats = []
    today = date.today()

    # Body battery is cheaper as a range call
    start_str = (today - timedelta(days=days)).isoformat()
    end_str   = today.isoformat()
    try:
        bb_list = api.get_body_battery(start_str, end_str)
        bb_by_date = {
            entry.get("date", "")[:10]: entry
            for entry in (bb_list or [])
        }
    except Exception:
        bb_by_date = {}

    for i in range(days):
        d = today - timedelta(days=i)
        d_str = d.isoformat()
        entry: dict = {"date": d_str}

        # Steps + resting HR + stress
        try:
            s = api.get_stats(d_str)
            entry["stepCount"]         = s.get("totalSteps")
            entry["restingHeartRate"]  = s.get("restingHeartRate")
            entry["avgStress"]         = s.get("averageStressLevel")
        except Exception:
            entry["stepCount"] = entry["restingHeartRate"] = entry["avgStress"] = None

        # Sleep
        try:
            sl = api.get_sleep_data(d_str)
            daily = (sl.get("dailySleepDTO") or {})
            entry["sleepScoreOverall"]  = daily.get("sleepScores", {}).get("overall", {}).get("value") if isinstance(daily.get("sleepScores"), dict) else None
            entry["sleepDurationSeconds"] = daily.get("sleepTimeSeconds")
        except Exception:
            entry["sleepScoreOverall"] = entry["sleepDurationSeconds"] = None

        # Body battery (from range fetch)
        bb = bb_by_date.get(d_str, {})
        entry["bodyBatteryLow"]  = bb.get("charged")    # low of the day
        entry["bodyBatteryHigh"] = bb.get("drained")    # high of the day

        stats.append(entry)

    return stats

# ---------------------------------------------------------------------------
# FIT file download
# ---------------------------------------------------------------------------

def download_fit_files(api: Garmin, new_activities: list[dict], already_downloaded: set):
    downloaded = 0
    for raw in new_activities:
        activity_id   = raw.get("activityId")
        type_key      = (raw.get("activityType") or {}).get("typeKey", "other")
        sport         = SPORT_MAP.get(type_key, "other")
        raw_date      = (raw.get("startTimeLocal") or "")[:10]
        name          = raw.get("activityName", "Unknown")
        duration_min  = int(float(raw.get("duration", 0) or 0)) // 60
        label         = type_key.replace("_", "-")
        dest_dir      = IMPORTS_DIR / ACTIVITY_FOLDER_MAP.get(sport, "other")
        dest_dir.mkdir(parents=True, exist_ok=True)
        filename      = f"{raw_date}_{label}_{activity_id}.fit"
        dest          = dest_dir / filename

        print(f"  [{raw_date}] {name} ({type_key}, {duration_min} min)")
        try:
            zip_data = api.download_activity(
                activity_id,
                dl_fmt=Garmin.ActivityDownloadFormat.ORIGINAL,
            )
            fit_data = extract_fit_from_zip(zip_data)
            if fit_data:
                dest.write_bytes(fit_data)
                print(f"    → {dest.relative_to(BASE_DIR)}")
            else:
                dest_zip = dest.with_suffix(".zip")
                dest_zip.write_bytes(zip_data)
                print(f"    → {dest_zip.relative_to(BASE_DIR)} (ZIP)")
            already_downloaded.add(str(activity_id))
            downloaded += 1
        except Exception as e:
            print(f"    Download error: {e}")

    return downloaded

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def sync(days: int = 365, sync_all: bool = False, download_fit: bool = False,
         stats_days: int = 30):
    api = garmin_login()
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # ── Activities ──────────────────────────────────────────────────────────
    limit = 1000 if sync_all else min(days * 3, 200)
    print(f"\nFetching activity list (max {limit})...")
    raw_activities = api.get_activities(0, limit) or []

    if not sync_all:
        cutoff = date.today() - timedelta(days=days)
        raw_activities = [
            a for a in raw_activities
            if (a.get("startTimeLocal") or "")[:10] >= cutoff.isoformat()
        ]

    print(f"  {len(raw_activities)} activities in range.")

    # Map to dashboard schema (skip unknown sports)
    mapped = [m for m in (map_activity(a) for a in raw_activities) if m]

    # Brick detection: cycling + running on same day within 90 min
    running   = [a for a in mapped if a["sport"] == "running"]
    cycling   = [a for a in mapped if a["sport"] == "cycling"]
    brick_idx = 0
    for ride in cycling:
        ride_end = datetime.fromisoformat(ride["startTime"].rstrip("Z")) + timedelta(seconds=ride["durationSeconds"])
        for run in running:
            run_start = datetime.fromisoformat(run["startTime"].rstrip("Z"))
            same_day  = ride["startTime"][:10] == run["startTime"][:10]
            gap_min   = (run_start - ride_end).total_seconds() / 60
            if same_day and 0 <= gap_min <= 90:
                brick_id = f"brick-{ride['startTime'][:10]}-{brick_idx}"
                brick_idx += 1
                ride["sport"] = "brick"
                run["sport"]  = "brick"
                ride["brickGroupId"] = brick_id
                run["brickGroupId"]  = brick_id

    # Sort newest first and write
    mapped.sort(key=lambda a: a["startTime"], reverse=True)
    activities_out = {
        "fetchedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "activities": mapped,
    }
    out_path = DATA_DIR / "activities.json"
    out_path.write_text(json.dumps(activities_out, indent=2, ensure_ascii=False))
    print(f"  Wrote {len(mapped)} activities → {out_path.relative_to(BASE_DIR.parent)}")

    # ── Daily stats ─────────────────────────────────────────────────────────
    print(f"\nFetching daily stats for last {stats_days} days...")
    daily = fetch_daily_stats(api, stats_days)
    stats_out = {
        "fetchedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "stats": daily,
    }
    stats_path = DATA_DIR / "daily_stats.json"
    stats_path.write_text(json.dumps(stats_out, indent=2, ensure_ascii=False))
    print(f"  Wrote {len(daily)} days → {stats_path.relative_to(BASE_DIR.parent)}")

    # ── FIT download (optional) ──────────────────────────────────────────────
    if download_fit:
        state = load_state()
        already_downloaded = set(str(i) for i in state.get("downloaded_ids", []))
        new_for_fit = [
            a for a in raw_activities
            if str(a.get("activityId")) not in already_downloaded
        ]
        print(f"\nDownloading {len(new_for_fit)} new FIT files...")
        count = download_fit_files(api, new_for_fit, already_downloaded)
        state["downloaded_ids"] = list(already_downloaded)
        state["last_sync"] = datetime.now().isoformat()
        save_state(state)
        print(f"  {count}/{len(new_for_fit)} FIT files downloaded → {IMPORTS_DIR.relative_to(BASE_DIR.parent)}/")

    print("\nDone. Commit and push public/data/ to update the dashboard.")

# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Fetch Garmin data → public/data/ JSON for the dashboard"
    )
    parser.add_argument("--days", type=int, default=7,
                        help="Activities from the last N days (default: 365)")
    parser.add_argument("--all", dest="sync_all", action="store_true",
                        help="Fetch all activities (ignores --days)")
    parser.add_argument("--fit", dest="download_fit", action="store_true",
                        help="Also download raw FIT files to imports/")
    parser.add_argument("--stats-days", type=int, default=30,
                        help="Days of daily stats to fetch (default: 30)")
    args = parser.parse_args()

    sync(
        days=args.days,
        sync_all=args.sync_all,
        download_fit=args.download_fit,
        stats_days=args.stats_days,
    )
