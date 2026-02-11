# Landscaper Diagnostic: Tool Execution Hang

**Date:** 2026-02-10
**Symptom:** Landscaper plans multi-unit update then goes silent — no error, no response, no "Failed to fetch"

---

## Root Cause

**The Anthropic API client timeout (60s) is exceeded during the tool execution loop when `update_units` auto-executes a batch of 40+ units.**

The timing chain is:

1. Frontend sends message to Django (90s AbortController timeout)
2. Django calls Claude API (60s client timeout) — Claude responds with `tool_use` block for `update_units`
3. `update_units` is in `AUTO_EXECUTE_TOOLS` → `propose_only=False` → `MutationService._execute_mutation()` runs
4. For 40+ units, `_execute_mutation` executes **4-5 SQL queries per unit** (unit INSERT, lease SELECT, lease INSERT/UPDATE, unit_type INSERT) = **160-200 DB round-trips** against Neon PostgreSQL (remote)
5. Tool execution completes (estimated 5-30s depending on Neon latency)
6. Tool result is serialized via `str(result)` and appended to `claude_messages`
7. **Second Claude API call** at `ai_handler.py:5158` — this continuation call sends the full conversation (system prompt + all messages + tool results) back to Claude
8. **This second call uses the same `api_kwargs` which includes the 60s timeout, but the accumulated context is now much larger** (system prompt can be 10-50K tokens with rich project context + platform knowledge + tool definitions)

The combination of:
- Large accumulated message context (original messages + tool_use blocks + tool results for 40+ units)
- The second Claude API call needing to process all of this
- The 60s client timeout potentially being insufficient for a response that needs to summarize 40+ unit operations
- **No loop iteration guard** — if Claude returns another `tool_use` in the continuation, the loop continues with even more context

...causes the Django view to hang indefinitely from the frontend's perspective, or the Anthropic client to raise a timeout exception that **is caught by the outer `except Exception` at `ai_handler.py:5195`**, returning a fallback response. However, if the total time exceeds 90s, the frontend AbortController fires, but **silently** because the abort error just sets `error` state to "Request timed out" — which may not be visible if the loading spinner masks it.

### Most Likely Specific Failure Point

**`ai_handler.py:5158`** — the continuation `client.messages.create()` call after tool execution.

The `str(result)` at line 5122 converts the entire `_execute_mutation` return dict to a string, including the `results` array of 40+ `{"unit_id": N, "unit_number": "X"}` objects. This string is sent as the tool_result content. Combined with the existing conversation context, the second API call processes a very large input.

**Critical timing math:**
- Tool execution (40 units × ~4 queries × ~50ms Neon latency): ~8-15s
- Second Claude API call with large context: 10-30s (or timeout at 60s)
- Total: **18-75s** — right at the boundary of the 60s Anthropic timeout and 90s frontend timeout

---

## Evidence

### Timeout Configuration Chain

| Layer | Timeout | File:Line |
|-------|---------|-----------|
| Frontend AbortController | 90,000ms | `src/hooks/useLandscaperThreads.ts:5` |
| Django request timeout | **None configured** | `backend/config/settings.py` (no timeout middleware) |
| Anthropic client timeout | 60s | `backend/apps/landscaper/ai_handler.py:539` |
| Claude API max_tokens | 2048 | `backend/apps/landscaper/ai_handler.py:542` |

### Key Code References

- **Tool execution loop:** `ai_handler.py:5045-5164` — `while response.stop_reason == "tool_use" and tool_executor`
- **Tool result serialization:** `ai_handler.py:5122` — `"content": str(result)` (no size limit)
- **Continuation API call:** `ai_handler.py:5158-5161` — reuses `api_kwargs` with accumulated messages
- **AUTO_EXECUTE_TOOLS list:** `tool_executor.py:10187-10192` — `update_units` is auto-executed
- **MutationService batch execution:** `mutation_service.py:1043-1252` — 4+ queries per unit, no batching
- **Error catch:** `ai_handler.py:5195` — generic `except Exception` returns fallback response
- **Frontend error handling:** `useLandscaperThreads.ts:440` — AbortError sets error state

### Missing Safeguards

1. **No loop iteration limit** — the `while` loop at line 5045 has no `max_iterations` guard
2. **No tool result truncation** — `str(result)` at line 5122 can produce arbitrarily large strings
3. **No total elapsed time check** — the loop doesn't track cumulative time vs. frontend timeout
4. **No logging before/after continuation call** — there's no log at line 5158, making it invisible when it hangs
5. **Django has no request timeout** — `manage.py runserver` has no worker timeout (unlike gunicorn)

---

## Tool Loop Architecture

```
get_landscaper_response()                      [ai_handler.py:4881]
  │
  ├── Build system prompt + rich context       [ai_handler.py:4914-4978]
  ├── Initial Claude API call                  [ai_handler.py:5031]
  │
  └── while response.stop_reason == "tool_use" [ai_handler.py:5045]
        │
        ├── Extract tool_use blocks            [ai_handler.py:5047-5052]
        ├── For each tool_use block:
        │     ├── tool_executor(name, input)    [ai_handler.py:5069-5073]
        │     │     └── execute_tool()          [tool_executor.py:10195]
        │     │           └── AUTO_EXECUTE check [tool_executor.py:10234]
        │     │           └── handler()          [tool_executor.py:10240]
        │     │                 └── MutationService._execute_mutation()
        │     │                       └── 4+ SQL queries per unit
        │     │
        │     ├── Track field_updates           [ai_handler.py:5076-5118]
        │     └── Append tool_result            [ai_handler.py:5119-5123]
        │
        ├── Append assistant + user messages    [ai_handler.py:5148-5155]
        └── Continuation Claude API call        [ai_handler.py:5158] ← HANG POINT
              └── Uses same api_kwargs + accumulated messages
```

---

## Failure Point

**`ai_handler.py:5158`** — The continuation `client.messages.create()` call.

After `update_units` auto-executes 40+ unit inserts/updates (taking 8-15s), the tool result string is appended to the messages. The continuation call then sends this large payload to Claude. With the Anthropic client timeout at 60s, and the total elapsed time already at 8-15s for tool execution, the continuation call has at most 45-52s to complete. If the system prompt is large (with rich project context, platform knowledge, and alpha help), the input token count can be very high, causing the Claude API to take longer to respond.

**Why no error appears in the UI:** The 90s frontend timeout fires an `AbortError`, but the error message "Request timed out. Please try again." is set via `setError()` which displays in the chat panel. However, if the loading spinner is still showing and the error state is rendered below the fold or in a non-visible area, the user sees only the spinner with no progress. Additionally, if the Django request is still processing server-side after the frontend aborts, no error reaches the browser console.

---

## Recommended Fix

### Immediate (unblock testing):

1. **Add a loop iteration limit and total time budget:**
```python
# ai_handler.py, around line 5044
import time
MAX_TOOL_ITERATIONS = 5
TOTAL_TIME_BUDGET_SECONDS = 75  # Leave 15s buffer for frontend's 90s timeout
loop_start = time.time()
iteration = 0

while response.stop_reason == "tool_use" and tool_executor:
    iteration += 1
    if iteration > MAX_TOOL_ITERATIONS:
        logger.warning(f"[AI_HANDLER] Tool loop hit max iterations ({MAX_TOOL_ITERATIONS})")
        break
    elapsed = time.time() - loop_start
    if elapsed > TOTAL_TIME_BUDGET_SECONDS:
        logger.warning(f"[AI_HANDLER] Tool loop exceeded time budget ({elapsed:.1f}s)")
        break
    # ... rest of loop
```

2. **Truncate tool results before sending to Claude:**
```python
# ai_handler.py, around line 5119-5123
result_str = str(result)
if len(result_str) > 4000:
    result_str = result_str[:4000] + f"... [truncated, {len(result_str)} chars total]"

tool_results.append({
    "type": "tool_result",
    "tool_use_id": tool_id,
    "content": result_str
})
```

3. **Increase Anthropic client timeout for continuation calls:**
```python
# ai_handler.py, line 539
ANTHROPIC_TIMEOUT_SECONDS = 120  # Allow enough time for tool loop + continuation
```

### Medium-term:

4. **Batch SQL operations in `_execute_mutation`** — use a single multi-row INSERT instead of per-unit queries
5. **Add logging around the continuation call** (line 5158) for observability
6. **Consider streaming** the continuation response to keep the connection alive

---

## Temporary Logging Added

**None.** This diagnostic was completed through static code analysis only. No files were modified.

If runtime verification is needed, add the following temporary logging:

```python
# ai_handler.py, before line 5158:
logger.warning(f"[DIAG] Sending continuation to Claude: {len(claude_messages)} messages, "
               f"tool_results_size={sum(len(str(tr.get('content',''))) for tr in tool_results)}")

# ai_handler.py, after line 5161:
logger.warning(f"[DIAG] Continuation response: stop_reason={response.stop_reason}, "
               f"output_tokens={response.usage.output_tokens}")
```
