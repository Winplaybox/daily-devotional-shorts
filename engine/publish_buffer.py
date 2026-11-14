"""Resolve the Panchang production date using an explicit rolling calendar-day buffer."""
from __future__ import annotations

import argparse
import re
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


def _load_timezone(timezone_name: str):
    try:
        return ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError as exc:
        raise ValueError(f"Unknown IANA timezone: {timezone_name}") from exc


def local_calendar_date(timezone_name: str, instant: datetime | None = None) -> date:
    """Return the calendar date of an aware instant in the requested IANA timezone."""
    zone = _load_timezone(timezone_name)
    current = instant or datetime.now(timezone.utc)
    if current.tzinfo is None or current.utcoffset() is None:
        raise ValueError("instant must be timezone-aware")
    return current.astimezone(zone).date()


def resolve_target_date(
    buffer_days: int = 1,
    timezone_name: str = "Asia/Kolkata",
    today: date | None = None,
) -> date:
    """Return the local calendar date N days ahead; never use UTC date implicitly."""
    if isinstance(buffer_days, bool) or not isinstance(buffer_days, int) or buffer_days < 0:
        raise ValueError("buffer_days must be a non-negative integer")
    if today is not None:
        _load_timezone(timezone_name)
        if not isinstance(today, date) or isinstance(today, datetime):
            raise ValueError("today must be a calendar date")
        base_date = today
    else:
        base_date = local_calendar_date(timezone_name)
    return base_date + timedelta(days=buffer_days)


def parse_date_override(value: str) -> date:
    """Parse only a real ISO calendar date in the required YYYY-MM-DD format."""
    raw = value.strip() if isinstance(value, str) else ""
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", raw):
        raise ValueError("--date-override must use YYYY-MM-DD")
    try:
        return date.fromisoformat(raw)
    except ValueError as exc:
        raise ValueError("--date-override must be a valid calendar date in YYYY-MM-DD format") from exc


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=1)
    parser.add_argument("--timezone", default="Asia/Kolkata")
    parser.add_argument("--date-override", default="")
    parser.add_argument("--github-env", default="")
    args = parser.parse_args()

    if args.date_override.strip():
        try:
            target = parse_date_override(args.date_override)
        except ValueError as exc:
            raise SystemExit(str(exc)) from exc
        source = "manual override"
    else:
        target = resolve_target_date(args.days, args.timezone)
        source = f"{args.days}-day buffer in {args.timezone}"

    line = f"PANCHANG_DATE={target.isoformat()}"
    if args.github_env:
        with Path(args.github_env).open("a", encoding="utf-8") as handle:
            handle.write(line + "\n")
    print(f"[BUFFER] Panchang/publication date: {target.isoformat()} ({source})")


if __name__ == "__main__":
    main()
