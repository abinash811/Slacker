import enum


class TicketStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    PENDING = "pending"
    RESOLVED = "resolved"
    CLOSED = "closed"


class TicketPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TeamRole(str, enum.Enum):
    MEMBER = "member"
    MANAGER = "manager"


class EventSource(str, enum.Enum):
    DASHBOARD = "dashboard"
    SLACK = "slack"
    SYSTEM = "system"
