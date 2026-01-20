"""
Benchmark API views for IREM and other industry benchmarks.

These endpoints provide direct SQL queries against the opex_benchmark table,
bypassing RAG for structured numeric data.
"""

import json
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from ..services.benchmark_service import get_benchmark_service

logger = logging.getLogger(__name__)


@csrf_exempt
@require_http_methods(["GET"])
def get_expense_benchmark(request):
    """
    GET /api/knowledge/benchmarks/expense/

    Query params:
    - category: expense category (required)
    - subcategory: expense subcategory (optional)
    - property_type: multifamily, office, etc. (default: multifamily)
    - source: IREM, BOMA, etc. (default: IREM)
    - year: specific year (optional, defaults to most recent)
    """
    category = request.GET.get('category')
    if not category:
        return JsonResponse({'error': 'category is required'}, status=400)

    service = get_benchmark_service()

    source_year = request.GET.get('year')
    if source_year:
        try:
            source_year = int(source_year)
        except ValueError:
            return JsonResponse({'error': 'year must be an integer'}, status=400)

    result = service.get_benchmark(
        expense_category=category,
        expense_subcategory=request.GET.get('subcategory'),
        property_type=request.GET.get('property_type', 'multifamily'),
        source=request.GET.get('source', 'IREM'),
        source_year=source_year,
    )

    if not result:
        return JsonResponse({'error': 'No benchmark found'}, status=404)

    return JsonResponse(result)


@csrf_exempt
@require_http_methods(["POST"])
def compare_expense(request):
    """
    POST /api/knowledge/benchmarks/compare/

    Body:
    {
        "actual_value": 950,
        "value_type": "per_unit",  // or "pct_of_egi"
        "category": "operating_maintenance",
        "subcategory": "repairs_maintenance",  // optional
        "property_type": "multifamily"  // optional
    }
    """
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    actual_value = data.get('actual_value')
    value_type = data.get('value_type')
    category = data.get('category')

    if actual_value is None:
        return JsonResponse({'error': 'actual_value is required'}, status=400)
    if not value_type:
        return JsonResponse({'error': 'value_type is required'}, status=400)
    if not category:
        return JsonResponse({'error': 'category is required'}, status=400)

    service = get_benchmark_service()
    result = service.compare_to_benchmark(
        actual_value=float(actual_value),
        value_type=value_type,
        expense_category=category,
        expense_subcategory=data.get('subcategory'),
        property_type=data.get('property_type', 'multifamily'),
    )

    return JsonResponse(result)


@csrf_exempt
@require_http_methods(["GET"])
def get_expense_summary(request):
    """
    GET /api/knowledge/benchmarks/summary/

    Returns complete expense breakdown for a source/year.

    Query params:
    - source: IREM, BOMA, etc. (default: IREM)
    - year: 2024, 2023, etc. (default: 2024)
    - property_type: multifamily, office, etc. (default: multifamily)
    """
    source_year = request.GET.get('year', '2024')
    try:
        source_year = int(source_year)
    except ValueError:
        return JsonResponse({'error': 'year must be an integer'}, status=400)

    service = get_benchmark_service()
    result = service.get_expense_summary(
        source=request.GET.get('source', 'IREM'),
        source_year=source_year,
        property_type=request.GET.get('property_type', 'multifamily'),
    )

    return JsonResponse(result)


@csrf_exempt
@require_http_methods(["GET"])
def search_benchmarks(request):
    """
    GET /api/knowledge/benchmarks/search/

    Search benchmarks by keyword.

    Query params:
    - q: search query (required) - e.g., "R&M", "utilities", "insurance"
    - property_type: multifamily, office, etc. (default: multifamily)
    - year: specific year (optional)
    """
    query = request.GET.get('q')
    if not query:
        return JsonResponse({'error': 'q (query) is required'}, status=400)

    source_year = request.GET.get('year')
    if source_year:
        try:
            source_year = int(source_year)
        except ValueError:
            return JsonResponse({'error': 'year must be an integer'}, status=400)

    service = get_benchmark_service()
    results = service.search_benchmarks(
        query=query,
        property_type=request.GET.get('property_type', 'multifamily'),
        source_year=source_year,
    )

    return JsonResponse({
        'query': query,
        'results': results,
        'count': len(results)
    })


@csrf_exempt
@require_http_methods(["GET"])
def get_category_trend(request):
    """
    GET /api/knowledge/benchmarks/trend/

    Get historical benchmark data for trend analysis.

    Query params:
    - category: expense category (required)
    - property_type: multifamily, office, etc. (default: multifamily)
    """
    category = request.GET.get('category')
    if not category:
        return JsonResponse({'error': 'category is required'}, status=400)

    service = get_benchmark_service()
    results = service.get_all_benchmarks_for_category(
        expense_category=category,
        property_type=request.GET.get('property_type', 'multifamily'),
    )

    return JsonResponse({
        'category': category,
        'trend': results,
        'years': len(results)
    })
