"""Resolve the Panchang production date using an explicit rolling calendar-day buffer."""
from __future__ import annotations

import argparse
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


def resolve_target_date(
    buffer_days: int = 3,
    timezone_name: str = "Asia/Kolkata",
    today: date | None = None,
) -> date:
    """Return the local calendar date N days ahead; never use UTC date implicitly."""
    if isinstance(buffer_days, bool) or buffer_days < 0:
        raise ValueError("buffer_days must be a non-negative integer")
    try:
        zone = ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError as exc:
        raise ValueError(f"Unknown IANA timezone: {timezone_name}") from exc
    base_date = today or datetime.now(zone).date()
    return base_date + timedelta(days=buffer_days)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=3)
    parser.add_argument("--timezone", default="Asia/Kolkata")
    parser.add_argument("--date-override", default="")
    parser.add_argument("--github-env", default="")
    args = parser.parse_args()

    if args.date_override.strip():
        try:
            target = date.fromisoformat(args.date_override.strip())
        except ValueError as exc:
            raise SystemExit("--date-override must use YYYY-MM-DD") from exc
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
