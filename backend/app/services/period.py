from datetime import datetime, timedelta, timezone


def week_bounds(reference: datetime, weeks_ago: int = 0) -> tuple[datetime, datetime]:
    """[start, end) of an ISO week (Monday 00:00 UTC), `weeks_ago` weeks
    before the week containing `reference`.
    """
    start_of_this_week = (reference - timedelta(days=reference.weekday())).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    start = start_of_this_week - timedelta(weeks=weeks_ago)
    return start, start + timedelta(weeks=1)


def today_bounds(reference: datetime) -> tuple[datetime, datetime]:
    start = reference.replace(hour=0, minute=0, second=0, microsecond=0)
    return start, start + timedelta(days=1)


def month_bounds(reference: datetime, months_ago: int = 0) -> tuple[datetime, datetime]:
    year, month = reference.year, reference.month
    for _ in range(months_ago):
        month -= 1
        if month == 0:
            month, year = 12, year - 1
    start = datetime(year, month, 1, tzinfo=timezone.utc)
    end_month, end_year = (month + 1, year) if month < 12 else (1, year + 1)
    end = datetime(end_year, end_month, 1, tzinfo=timezone.utc)
    return start, end


def pct_change(current: float, previous: float) -> float | None:
    if previous == 0:
        return None
    return round((current - previous) / previous * 100, 1)
