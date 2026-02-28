"""
TEMPORARY: Debug endpoint for P2 tool testing.
Remove this file after testing is complete.
"""
import json
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from rest_framework.permissions import AllowAny

logger = logging.getLogger(__name__)


@csrf_exempt
@require_POST
def debug_test_tool(request):
    """
    POST /api/landscaper/debug/test-tool/
    Body: {"tool_name": "...", "tool_input": {...}, "project_id": 17, "propose_only": false}

    Calls execute_tool() directly - same code path as AI handler.
    No auth required (debug only).
    """
    try:
        body = json.loads(request.body)
        tool_name = body.get('tool_name')
        tool_input = body.get('tool_input', {})
        project_id = body.get('project_id')
        propose_only = body.get('propose_only', True)

        if not tool_name or not project_id:
            return JsonResponse({'success': False, 'error': 'tool_name and project_id required'}, status=400)

        from .tool_executor import execute_tool
        result = execute_tool(
            tool_name=tool_name,
            tool_input=tool_input,
            project_id=project_id,
            propose_only=propose_only,
        )

        # Serialize Decimal etc
        return JsonResponse(result, json_dumps_params={'default': str})
    except Exception as e:
        logger.exception(f"Debug tool test error: {e}")
        return JsonResponse({'success': False, 'error': str(e)}, status=500)
