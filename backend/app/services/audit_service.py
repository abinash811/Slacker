from sqlalchemy.orm import Session

from app.models.audit import AuditEvent
from app.models.enums import EventSource


def record_event(
    db: Session,
    *,
    ticket_id: int | None,
    actor_id: int | None,
    source: EventSource,
    event_type: str,
    payload: dict | None = None,
) -> AuditEvent:
    event = AuditEvent(
        ticket_id=ticket_id,
        actor_id=actor_id,
        source=source,
        event_type=event_type,
        payload=payload or {},
    )
    db.add(event)
    return event
