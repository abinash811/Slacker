"""Slack's Events API redelivers events on a slow/failed ack (see
docs/ARCHITECTURE.md). These tests exercise the dedup table directly so a
reprocessed event never double-applies a ticket mutation.
"""

from app.slack.bolt_app import _already_processed, _mark_processed


def test_event_marked_processed_is_detected_on_second_check(db_session):
    assert _already_processed(db_session, "Ev0123ABC") is False

    _mark_processed(db_session, "Ev0123ABC")

    assert _already_processed(db_session, "Ev0123ABC") is True


def test_marking_the_same_event_twice_does_not_raise(db_session):
    _mark_processed(db_session, "Ev9999")
    _mark_processed(db_session, "Ev9999")  # simulates a retry racing the first mark

    assert _already_processed(db_session, "Ev9999") is True


def test_missing_event_id_is_never_considered_processed(db_session):
    assert _already_processed(db_session, None) is False
    _mark_processed(db_session, None)  # no-op, must not error
