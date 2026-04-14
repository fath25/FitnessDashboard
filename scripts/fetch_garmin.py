#!/usr/bin/env python3
"""
Fetch Garmin Connect data and write JSON files to public/data/.

Required environment variables:
  GARMIN_EMAIL      — your Garmin Connect email
  GARMIN_PASSWORD   — your Garmin Connect password

Outputs:
  public/data/activities.json
  public/data/daily_stats.json
"""

import json
import os
import sys
from datetime import date, timedelta
from pathlib import Path

import garth

# ─── Config ───────────────────────────────────────────────────────────────────

REPO_ROOT = Path(__file__).parent.parent
DATA_DIR = REPO_ROOT / "public" / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

ACTIVITIES_FILE = DATA_DIR / "activities.json"
DAILY_STATS_FILE = DATA_DIR / "daily_stats.json"

FETCH_DAYS = 180  # fetch last 6 months of activities

SPORT_MAP: dict[str, str] = {
    "running": "running",
    "trail_running": "running",
    "treadmill_running": "running",
    "cycling": "cycling",
    "road_biking": "cycling",
    "mountain_biking": "cycling",
    "indoor_cycling": "cycling",
    "virtual_ride": "cycling",
    "swimming": "swimming",
    "open_water_swimming": "swimming",
    "pool_swimming": "swimming",
    "strength_training": "strength",
    "fitness_equipment": "strength",
    "gym": "strength",
}

# ─── Auth ─────────────────────────────────────────────────────────────────────

def login() -> None:
    email = os.environ.get("GARMIN_EMAIL")
    password = os.environ.get("GARMIN_PASSWORD")
    if not email or not password:
        sys.exit("ERROR: GARMIN_EMAIL and GARMIN_PASSWORD environment variables are required.")
    garth.login(email, password)
    print("✓ Logged in to Garmin Connect")


# ─── Activities ───────────────────────────────────────────────────────────────

def fetch_activities() -> list[dict]:
    end = date.today()
    start = end - timedelta(days=FETCH_DAYS)

    params = {
        "startDate": str(start),
        "endDate": str(end),
        "start": 0,
        "limit": 500,
    }

    try:
        raw = garth.connectapi(
            "/activitylist-service/activities/search/activities",
            params=params,
        )
    except Exception as e:
        print(f"WARNING: Could not fetch activities: {e}")
        return []

    if not isinstance(raw, list):
        print(f"WARNING: Unexpected activities response type: {type(raw)}")
        return []

    print(f"✓ Fetched {len(raw)} raw activities")
    return raw


def map_sport(type_key: str) -> str:
    return SPORT_MAP.get(type_key.lower(), "other")


def detect_bricks(activities: list[dict]) -> None:
    """Tag paired cycling+running activities on the same day as bricks."""
    from collections import defaultdict
    by_day: dict[str, list[dict]] = defaultdict(list)
    for a in activities:
        day = a.get("startTime", "")[:10]
        by_day[day].append(a)

    for day_acts in by_day.values():
        bikes = [a for a in day_acts if a["sport"] == "cycling"]
        runs = [a for a in day_acts if a["sport"] == "running"]
        for bike in bikes:
            for run in runs:
                bike_end_ts = bike.get("_endEpoch", 0)
                run_start_ts = run.get("_startEpoch", 0)
                gap_min = (run_start_ts - bike_end_ts) / 60
                if 0 <= gap_min <= 90:
                    group_id = f"brick-{day_acts[0]['startTime'][:10]}"
                    bike["brickGroupId"] = group_id
                    run["brickGroupId"] = group_id
                    bike["sport"] = "brick"
                    run["sport"] = "brick"


def parse_activity(raw: dict) -> dict | None:
    type_key = (raw.get("activityType") or {}).get("typeKey", "")
    sport = map_sport(type_key)
    if sport == "other":
        return None  # skip unsupported activities

    start_time = raw.get("startTimeLocal") or raw.get("startTimeGMT", "")
    duration = raw.get("duration", 0) or 0
    distance = raw.get("distance", 0) or 0

    # Pace: Garmin returns m/s for speed
    avg_speed_ms = raw.get("averageSpeed") or 0
    avg_pace_sec_per_km = None
    avg_speed_kmh = None
    if avg_speed_ms > 0:
        avg_speed_kmh = avg_speed_ms * 3.6
        if sport in ("running", "swimming"):
            avg_pace_sec_per_km = 1000 / avg_speed_ms

    # Epoch times for brick detection
    import time as _time
    from datetime import datetime as _dt
    try:
        start_epoch = _dt.fromisoformat(start_time.replace(" ", "T")).timestamp()
    except Exception:
        start_epoch = 0

    activity = {
        "id": str(raw.get("activityId", "")),
        "sport": sport,
        "startTime": start_time.replace(" ", "T"),
        "durationSeconds": round(duration),
        "distanceMeters": round(distance),
        "avgHeartRate": raw.get("averageHR"),
        "maxHeartRate": raw.get("maxHR"),
        "avgPaceSecPerKm": round(avg_pace_sec_per_km, 1) if avg_pace_sec_per_km else None,
        "avgSpeedKmh": round(avg_speed_kmh, 1) if avg_speed_kmh else None,
        "avgPowerWatts": raw.get("avgPower"),
        "avgCadence": raw.get("averageRunningCadenceInStepsPerMinute")
            or raw.get("averageBikingCadenceInRevPerMinute"),
        "elevationGainMeters": raw.get("elevationGain"),
        "vo2maxEstimate": raw.get("vO2MaxValue"),
        "trainingEffect": raw.get("aerobicTrainingEffect"),
        "calories": raw.get("calories"),
        "laps": [],
        "name": raw.get("activityName", ""),
        "notes": None,
        "brickGroupId": None,
        "_startEpoch": start_epoch,
        "_endEpoch": start_epoch + duration,
    }
    return activity


def build_activities_json(raw_list: list[dict]) -> dict:
    from datetime import datetime as _dt
    activities = []
    for raw in raw_list:
        parsed = parse_activity(raw)
        if parsed:
            activities.append(parsed)

    detect_bricks(activities)

    # Remove internal epoch fields before saving
    for a in activities:
        a.pop("_startEpoch", None)
        a.pop("_endEpoch", None)

    activities.sort(key=lambda a: a["startTime"], reverse=True)
    return {"fetchedAt": _dt.utcnow().isoformat() + "Z", "activities": activities}


# ─── Daily stats ──────────────────────────────────────────────────────────────

def fetch_daily_stats() -> list[dict]:
    from datetime import datetime as _dt
    end = date.today()
    start = end - timedelta(days=FETCH_DAYS)
    stats = []

    # Fetch in monthly chunks to avoid timeouts
    current = start
    while current <= end:
        chunk_end = min(current + timedelta(days=30), end)
        try:
            raw = garth.connectapi(
                "/userstats-service/wellness/daily",
                params={"startDate": str(current), "endDate": str(chunk_end)},
            )
            if isinstance(raw, dict):
                raw = raw.get("allMetrics", {}).get("metricsMap", {})
                # Garmin wraps wellness data differently — try flat list
            if isinstance(raw, list):
                for item in raw:
                    stats.append(parse_daily_stat(item))
        except Exception as e:
            print(f"WARNING: Daily stats chunk {current}–{chunk_end}: {e}")

        current = chunk_end + timedelta(days=1)

    # Also try per-day endpoint for recent days
    for i in range(min(30, FETCH_DAYS)):
        day = end - timedelta(days=i)
        try:
            raw = garth.connectapi(f"/userstats-service/wellness/daily/{day}")
            if raw:
                stats.append(parse_daily_stat(raw))
        except Exception:
            pass

    # Deduplicate by date
    seen = {}
    for s in stats:
        if s.get("date") and s["date"] not in seen:
            seen[s["date"]] = s

    return list(seen.values())


def parse_daily_stat(raw: dict) -> dict:
    return {
        "date": raw.get("calendarDate", raw.get("date", "")),
        "stepCount": raw.get("totalSteps"),
        "restingHeartRate": raw.get("restingHeartRate"),
        "avgStress": raw.get("averageStressLevel"),
        "bodyBatteryLow": raw.get("minBodyBattery"),
        "bodyBatteryHigh": raw.get("maxBodyBattery"),
        "sleepScoreOverall": (raw.get("sleepScores") or {}).get("overall"),
        "sleepDurationSeconds": raw.get("sleepTimeSeconds"),
    }


def build_daily_stats_json(stats: list[dict]) -> dict:
    from datetime import datetime as _dt
    stats_sorted = sorted(stats, key=lambda s: s.get("date", ""), reverse=True)
    return {"fetchedAt": _dt.utcnow().isoformat() + "Z", "stats": stats_sorted}


# ─── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    login()

    # Activities
    raw_activities = fetch_activities()
    activities_data = build_activities_json(raw_activities)
    ACTIVITIES_FILE.write_text(json.dumps(activities_data, indent=2))
    print(f"✓ Wrote {len(activities_data['activities'])} activities to {ACTIVITIES_FILE}")

    # Daily stats
    raw_stats = fetch_daily_stats()
    stats_data = build_daily_stats_json(raw_stats)
    DAILY_STATS_FILE.write_text(json.dumps(stats_data, indent=2))
    print(f"✓ Wrote {len(stats_data['stats'])} daily stats to {DAILY_STATS_FILE}")

    print("\nDone!")


if __name__ == "__main__":
    main()
