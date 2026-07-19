"""
Tests for the heartbeat-streaming response wrapper (LP-EDGEFIX-0719-LP21).

Regression cover for LP-CHAT503: the Landscaper message endpoint sent zero
bytes until its whole tool loop finished, and Railway's edge terminated the
silent connection at ~30s. Work that took 29.1s/30.9s server-side completed
fine but the client got an edge 503. These tests assert the two properties
that make the fix work: bytes start flowing quickly, and the final payload is
still parseable as plain JSON by an unchanged client.
"""

import json
import time

from rest_framework.response import Response

from apps.landscaper.views import _heartbeat_streaming_json


def _consume(response):
    """Collect the streamed chunks as (elapsed_seconds, chunk) pairs."""
    start = time.monotonic()
    chunks = []
    for chunk in response.streaming_content:
        chunks.append((time.monotonic() - start, chunk))
    return chunks


def test_first_byte_arrives_well_before_the_edge_window():
    """Slow work must produce a heartbeat within a few seconds, not at the end."""
    def slow_work():
        time.sleep(12)
        return {'success': True, 'value': 'done'}

    response = _heartbeat_streaming_json(slow_work)
    chunks = _consume(response)

    first_elapsed, first_chunk = chunks[0]
    assert first_chunk == b' ', 'first chunk should be a whitespace heartbeat'
    # Target is <5s; allow slack for slow CI while still failing loudly if the
    # response goes back to being silent until the work completes.
    assert first_elapsed < 8, f'first byte took {first_elapsed:.1f}s'

    total_elapsed = chunks[-1][0]
    assert total_elapsed >= 12, 'work should still have run to completion'


def test_streamed_body_parses_as_json_for_an_unchanged_client():
    """Leading whitespace is legal JSON, so response.json() still works."""
    def work():
        time.sleep(6)
        return {'success': True, 'user_message': {'id': 1}}

    response = _heartbeat_streaming_json(work)
    body = b''.join(chunk for _, chunk in _consume(response))

    assert body.startswith(b' '), 'expected heartbeats ahead of the payload'
    assert json.loads(body) == {'success': True, 'user_message': {'id': 1}}


def test_drf_response_is_rendered_through_the_drf_renderer():
    """The wrapped view returns DRF Responses; .data must survive intact."""
    def work():
        return Response({'success': True, 'assistant_message': {'content': 'hi'}})

    response = _heartbeat_streaming_json(work)
    body = b''.join(chunk for _, chunk in _consume(response))

    assert json.loads(body)['assistant_message']['content'] == 'hi'


def test_failure_is_reported_in_the_body_not_as_a_crash():
    """
    A streamed response commits its status before the work runs, so failures
    surface as success:false in the body. Both frontends branch on
    data.success rather than response.ok, so this matches their contract.
    """
    def exploding_work():
        raise ValueError('boom')

    response = _heartbeat_streaming_json(exploding_work)
    body = b''.join(chunk for _, chunk in _consume(response))

    payload = json.loads(body)
    assert payload['success'] is False
    assert 'boom' in payload['error']


def test_fast_work_streams_the_payload_without_padding():
    """Fast turns should behave exactly as before — no heartbeats needed."""
    def fast_work():
        return {'success': True, 'quick': True}

    response = _heartbeat_streaming_json(fast_work)
    body = b''.join(chunk for _, chunk in _consume(response))

    assert not body.startswith(b' ')
    assert json.loads(body) == {'success': True, 'quick': True}
