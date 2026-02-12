"""
Landscaper AI service with RAG-enhanced responses and tool execution.

Landscaper has access to:
1. STRUCTURED DATA: Full project context from database tables
   - Project profile, container hierarchy, unit/rent data
   - Operating expenses, budget, sales data, financial assumptions
2. DOCUMENT CONTENT: RAG-retrieved chunks from uploaded documents
3. QUERY RESULTS: On-demand database queries for specific questions
4. TOOLS: Can update project fields, read documents, and manage operating expenses

The system prompt includes ALL available project data so Landscaper
can answer questions about both structured data AND documents.
"""
import json
import logging
import os
import re
import time
import uuid
from decimal import Decimal
from typing import List, Dict, Any, Optional
from anthropic import Anthropic
from django.conf import settings
from django.db import connection


class DecimalEncoder(json.JSONEncoder):
    """JSON encoder that handles Decimal types from PostgreSQL."""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)

from .rag_retrieval import retrieve_rag_context, get_conversation_context, RAGContext
from .query_builder import execute_project_query
from .project_context import get_project_context
from .entity_fact_retriever import get_entity_fact_context

# Import tool definitions and executor from landscaper app
from apps.landscaper.ai_handler import LANDSCAPER_TOOLS, get_tools_for_context
from apps.landscaper.tool_executor import execute_tool

# Import analysis type config model
from apps.projects.models import AnalysisTypeConfig

logger = logging.getLogger(__name__)

CLAUDE_MODEL = "claude-sonnet-4-20250514"
ANTHROPIC_TIMEOUT_SECONDS = 60

# ---------------------------------------------------------------------------
# Strict document extraction guardrails
# ---------------------------------------------------------------------------

DOC_EXTRACTION_VERBS = (
    'extract', 'populate', 'import', 'add', 'insert', 'update', 'pull'
)

OPEX_KEYWORDS = (
    'operating expenses', 'operating expense', 'opex', 't-12', 't12'
)

DOC_REFERENCE_PATTERNS = (
    r'\bom\b',
    r'offering memorandum',
    r'\bmemorandum\b',
    r'\bdocument\b',
    r'\bt-12\b',
    r'\bt12\b',
)


def _is_opex_document_extraction_request(message: str) -> bool:
    message_lower = message.lower()
    if not any(verb in message_lower for verb in DOC_EXTRACTION_VERBS):
        return False
    if not any(keyword in message_lower for keyword in OPEX_KEYWORDS):
        return False
    return any(re.search(pattern, message_lower) for pattern in DOC_REFERENCE_PATTERNS)


def _get_anthropic_client() -> Anthropic:
    """Get Anthropic client with API key from .env or settings."""
    api_key = None

    # First, try to read directly from backend/.env file
    env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), '.env')
    if os.path.exists(env_file):
        with open(env_file) as f:
            for line in f:
                if line.strip().startswith('ANTHROPIC_API_KEY='):
                    api_key = line.split('=', 1)[1].strip()
                    break

    # Fallback to system env or Django settings
    if not api_key:
        api_key = os.getenv('ANTHROPIC_API_KEY') or getattr(settings, 'ANTHROPIC_API_KEY', None)

    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY not found. Set it in backend/.env or environment.")

    try:
        return Anthropic(api_key=api_key, timeout=ANTHROPIC_TIMEOUT_SECONDS)
    except TypeError:
        return Anthropic(api_key=api_key)


# Tab-specific system prompt additions
# Covers all 7 tabs: Project Home, Property, Operations, Feasibility/Valuation, Capitalization, Reports, Documents
TAB_CONTEXT = {
    'home': {
        'focus': 'project overview, status, key decisions, and cross-functional issues',
        'doc_types': None,  # All document types
        'prompt_addition': '''You are viewing the PROJECT HOME dashboard. Focus on:
- Overall project status and health
- Key decisions that need attention
- Cross-functional issues between departments
- Executive summary level information
- What's blocking progress and next steps
- High-level financial metrics and timeline'''
    },
    'property': {
        'focus': 'property details, physical characteristics, location, and site information',
        'doc_types': ['om', 'appraisal', 'site_plan', 'survey', 'environmental'],
        'prompt_addition': '''You are viewing the PROPERTY tab. Focus on:
- Physical property characteristics (size, age, condition)
- Location, market, and submarket positioning
- Site plans, surveys, and parcel information
- Zoning and entitlements
- Environmental and due diligence items
- Property-level assumptions and comparables'''
    },
    'operations': {
        'focus': 'rent roll, unit mix, operating expenses, NOI, and operational metrics',
        'doc_types': ['rent_roll', 'om', 'financial_statement', 't12', 'operating_statement'],
        'prompt_addition': '''You are viewing the OPERATIONS tab. Focus on:
- Rent roll details: unit types, counts, current rents, market rents
- Unit mix analysis and rent per SF
- Vacancy rates: physical, economic, credit loss, concessions
- Operating expenses by category (detailed and summary)
- Net Operating Income (NOI) and trends
- Expense ratios and per-unit metrics
- T-12 and historical operating performance'''
    },
    'feasibility': {
        'focus': 'returns analysis, IRR, NPV, equity multiple, cash flow projections, and sensitivity',
        'doc_types': ['pro_forma', 'financial_model', 'sensitivity', 'investment_memo'],
        'prompt_addition': '''You are viewing the FEASIBILITY / VALUATION tab. Focus on:
- Return metrics: IRR (levered/unlevered), NPV, Equity Multiple, Cash-on-Cash
- Cash flow projections and waterfall
- Valuation approaches: DCF, Cap Rate, Comparable Sales
- Exit assumptions and terminal value
- Sensitivity analysis: what variables move returns most
- Investment thesis, risks, and mitigants
- Comparison to target returns and hurdle rates'''
    },
    'capitalization': {
        'focus': 'capital structure, debt terms, equity requirements, and financing assumptions',
        'doc_types': ['term_sheet', 'loan_doc', 'partnership_agreement', 'loi', 'commitment_letter'],
        'prompt_addition': '''You are viewing the CAPITALIZATION tab. Focus on:
- Capital stack: senior debt, mezzanine, preferred equity, common equity
- Debt terms: LTV, DSCR, interest rate, amortization, term, prepayment
- Equity structure: GP/LP splits, promote/waterfall, preferred returns
- Sources and uses of funds
- Financing fees and closing costs
- Guaranty and recourse requirements
- Refinancing and exit assumptions'''
    },
    'reports': {
        'focus': 'analytics, reporting, exports, and data visualization',
        'doc_types': None,  # All types - reports can reference anything
        'prompt_addition': '''You are viewing the REPORTS tab. Focus on:
- Available reports and their purpose
- Key metrics and KPIs across the project
- Data exports and formatting
- Comparison reports (budget vs actual, scenario comparison)
- Executive summaries and presentation materials
- Audit trails and version history
- Custom report generation'''
    },
    'documents': {
        'focus': 'document management, extraction status, data quality, and ingestion',
        'doc_types': None,  # All types - this is the DMS
        'prompt_addition': '''You are viewing the DOCUMENTS tab. Focus on:
- Document inventory and organization
- Processing and extraction status
- AI extraction results and confidence scores
- Data quality issues and conflicts
- Missing documents or information gaps
- Source attribution and provenance
- Document versioning and updates
- Pending reviews and approvals'''
    },
}


def _get_analysis_context(project_id: int) -> Optional[str]:
    """
    Get analysis-aware context for Landscaper.

    Lookup order:
    1. Composite key (analysis_perspective + analysis_purpose)
    2. Legacy analysis_type
    3. None

    Returns None if no matching config row is found.
    """
    try:
        # Get the project's taxonomy dimensions + legacy type
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT analysis_perspective, analysis_purpose, analysis_type
                FROM landscape.tbl_project
                WHERE project_id = %s
                """,
                [project_id]
            )
            row = cursor.fetchone()
            if not row:
                return None

            perspective = row[0]
            purpose = row[1]
            analysis_type = row[2]

        config = None

        # Primary lookup: new composite dimensions
        if perspective and purpose:
            config = AnalysisTypeConfig.objects.filter(
                analysis_perspective=perspective,
                analysis_purpose=purpose
            ).first()

        # Fallback lookup: legacy analysis_type
        if not config and analysis_type:
            config = AnalysisTypeConfig.objects.filter(analysis_type=analysis_type).first()

        if not config or not config.landscaper_context:
            return None

        return config.landscaper_context
    except Exception as e:
        logger.warning(f"Failed to retrieve analysis context for project {project_id}: {e}")
        return None


def get_landscaper_response(
    user_message: str,
    project_id: int,
    conversation_history: List[Dict] = None,
    max_context_chunks: int = 5,
    db_context: Optional[Dict[str, Any]] = None,
    rag_context: Optional[Dict[str, Any]] = None,
    active_tab: str = 'home',
    page_context: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get RAG-enhanced response from Landscaper AI.

    Args:
        user_message: User's question/message
        project_id: Current project ID
        conversation_history: Optional prior messages (if not provided, fetched from DB)
        max_context_chunks: Max document chunks to include
        page_context: Optional UI context for tool filtering (e.g., 'cashflow', 'budget').
                      If provided, only tools relevant to that context will be available.

    Returns:
        Dict with 'content', 'metadata', 'context_used'
    """

    strict_opex_extraction = _is_opex_document_extraction_request(user_message)

    # 1. Retrieve or hydrate RAG context
    # Extract doc_system_context if present (from document-scoped chat)
    doc_system_context = None
    if isinstance(rag_context, dict):
        doc_system_context = rag_context.get('doc_context')

    if isinstance(rag_context, RAGContext):
        rag_context_obj = rag_context
    elif isinstance(rag_context, dict):
        rag_context_obj = RAGContext()
        normalized_chunks = []
        for chunk in rag_context.get('chunks', []):
            normalized_chunks.append({
                **chunk,
                'doc_name': chunk.get('doc_name') or chunk.get('filename') or 'Unknown document',
                'content': chunk.get('content') or chunk.get('content_text') or chunk.get('text') or ''
            })
        rag_context_obj.document_chunks = normalized_chunks
        if normalized_chunks:
            rag_context_obj.sources_used.append('documents')
    else:
        rag_context_obj = retrieve_rag_context(
            query=user_message,
            project_id=project_id,
            max_chunks=max_context_chunks,
            similarity_threshold=0.65
        )

    if db_context:
        rag_context_obj.db_query_result = db_context.get('query_result_text')
        rag_context_obj.db_query_type = db_context.get('query_type')
        if db_context.get('query_type'):
            rag_context_obj.sources_used.append('database')

    # 2. Get conversation history if not provided
    if conversation_history is None:
        conversation_history = get_conversation_context(project_id, limit=10)

    # 3. Get full project context (structured data from all tables)
    t0 = time.time()
    project_context = get_project_context(project_id)
    print(f"[AI_TIMING] get_project_context: {time.time() - t0:.2f}s")

    # 4. Get tab-specific context
    tab_config = TAB_CONTEXT.get(active_tab, TAB_CONTEXT['home'])
    tab_context = tab_config['prompt_addition']

    # 4b. Get analysis-specific context (from tbl_analysis_type_config)
    analysis_context = _get_analysis_context(project_id)

    # 5. Build system prompt with RAG context + project context + tab context + Entity-Fact knowledge + Analysis Type
    t0 = time.time()
    system_prompt = _build_system_prompt(
        rag_context_obj,
        project_context,
        tab_context,
        project_id,
        analysis_context
    )
    print(f"[AI_TIMING] _build_system_prompt: {time.time() - t0:.2f}s (prompt len: {len(system_prompt)} chars)")

    # Override system prompt for document-scoped chat
    if doc_system_context:
        system_prompt = doc_system_context + "\n\n" + system_prompt

    if strict_opex_extraction:
        has_doc_chunks = bool(getattr(rag_context_obj, 'document_chunks', []))
        strict_notice = "Document excerpts are available for extraction." if has_doc_chunks else (
            "No document excerpts are currently available; you must call get_project_documents "
            "and get_document_content (focus='operating_expenses') before extracting."
        )
        system_prompt += f"""

=== STRICT DOCUMENT EXTRACTION (OPERATING EXPENSES) ===
You MUST only extract operating expenses from the actual document content.
Do NOT estimate or use industry standards.
If the document does not explicitly list a line item, do not include it.
{strict_notice}
When calling update_operating_expenses, include source_document and only values explicitly cited.
If per-unit or per-SF amounts are listed, include per_unit and per_sf."""

    # 4. Build messages array
    messages = []
    for msg in conversation_history:
        messages.append({
            "role": msg['role'],
            "content": msg['content']
        })

    # Add current user message
    messages.append({
        "role": "user",
        "content": user_message
    })

    # 5. Call Claude API with tool support
    try:
        anthropic = _get_anthropic_client()

        # Track tool executions for metadata
        tool_executions = []

        # Track mutation proposals (Level 2 autonomy)
        mutation_proposals = []

        last_doc_source = None
        last_doc_has_content = False

        # Generate a source message ID for linking proposals to this chat message
        source_message_id = f"msg_{uuid.uuid4().hex[:12]}"

        # Get context-aware tools (if page_context is provided)
        # Fall back to active_tab if page_context not explicitly set
        effective_context = page_context or active_tab
        tools = get_tools_for_context(effective_context)
        print(f"[AI_TIMING] Using {len(tools)} tools for page_context='{effective_context}'")

        # Initial API call with tools
        t0 = time.time()
        print("[AI_TIMING] Starting initial Claude API call...")
        response = anthropic.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=4000,
            system=system_prompt,
            messages=messages,
            tools=tools
        )
        print(f"[AI_TIMING] Initial Claude API call: {time.time() - t0:.2f}s (stop_reason: {response.stop_reason}, tokens: {response.usage.input_tokens} in / {response.usage.output_tokens} out)")

        # Log initial response info
        logger.info(f"Initial response - stop_reason: {response.stop_reason}, content blocks: {len(response.content)}")
        for i, block in enumerate(response.content):
            logger.info(f"  Block {i}: type={block.type}, {'name=' + block.name if hasattr(block, 'name') else ''}")

        # Tool use loop - continue until we get a text response
        # IMPORTANT: Limit iterations to avoid timeout. Each iteration with large
        # document content takes 30-60s, so 4 iterations = ~2-3 min max.
        max_tool_iterations = 4
        iteration = 0
        total_tool_loop_start = time.time()

        # Overall timeout guard - abort if approaching 90s frontend timeout
        overall_timeout_seconds = 80

        while response.stop_reason == "tool_use" and iteration < max_tool_iterations:
            # Check overall timeout before starting another iteration
            elapsed = time.time() - total_tool_loop_start
            if elapsed > overall_timeout_seconds:
                print(f"[AI_TIMING] Aborting tool loop - elapsed {elapsed:.1f}s exceeds {overall_timeout_seconds}s timeout")
                logger.warning(f"Tool loop aborted after {elapsed:.1f}s to avoid timeout")
                break

            iteration += 1
            iteration_start = time.time()
            print(f"[AI_TIMING] Tool use iteration {iteration} starting...")

            # Process all tool use blocks in the response
            tool_results = []
            for content_block in response.content:
                if content_block.type == "tool_use":
                    tool_name = content_block.name
                    tool_input = content_block.input or {}
                    tool_use_id = content_block.id

                    logger.info(f"Executing tool: {tool_name} with input: {json.dumps(tool_input)[:200]}")

                    # Execute the tool (with proposal mode for mutations)
                    tool_exec_start = time.time()
                    try:
                        tool_input_exec = dict(tool_input)
                        propose_only = True

                        if tool_name == 'update_operating_expenses' and strict_opex_extraction:
                            if not last_doc_has_content:
                                tool_result = {
                                    'success': False,
                                    'error': "Document content required before updating operating expenses.",
                                }
                                tool_executions.append({
                                    'tool': tool_name,
                                    'input': tool_input_exec,
                                    'result': tool_result,
                                    'success': False,
                                    'is_proposal': False,
                                })
                                tool_results.append({
                                    "type": "tool_result",
                                    "tool_use_id": tool_use_id,
                                    "content": json.dumps(tool_result),
                                    "is_error": True,
                                })
                                continue

                            if last_doc_source and not tool_input_exec.get('source_document'):
                                tool_input_exec['source_document'] = last_doc_source

                            propose_only = False

                        tool_result = execute_tool(
                            tool_name,
                            tool_input_exec,
                            project_id,
                            source_message_id=source_message_id,
                            propose_only=propose_only
                        )
                        print(f"[AI_TIMING] Tool {tool_name} execution: {time.time() - tool_exec_start:.2f}s")

                        # Check if this was a mutation proposal
                        if tool_result.get('mutation_id') or tool_result.get('batch_id'):
                            # This is a proposal, not an immediate execution
                            mutation_proposals.append(tool_result)
                            logger.info(f"Created mutation proposal: {tool_result.get('mutation_id') or tool_result.get('batch_id')}")

                        tool_executions.append({
                            'tool': tool_name,
                            'input': tool_input_exec,
                            'result': tool_result,
                            'success': tool_result.get('success', not tool_result.get('error')),
                            'is_proposal': bool(tool_result.get('mutation_id') or tool_result.get('batch_id'))
                        })
                        result_content = json.dumps(tool_result, cls=DecimalEncoder)
                    except Exception as tool_error:
                        logger.error(f"Tool execution error: {tool_error}")
                        tool_executions.append({
                            'tool': tool_name,
                            'input': tool_input,
                            'error': str(tool_error),
                            'success': False
                        })
                        result_content = json.dumps({'error': str(tool_error)})

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tool_use_id,
                        "content": result_content
                    })

                    if tool_name == 'get_document_content' and tool_result.get('success'):
                        last_doc_source = tool_result.get('doc_name') or last_doc_source
                        last_doc_has_content = bool(tool_result.get('content'))

            # Add assistant's response (with tool_use) and tool results to messages
            messages.append({"role": "assistant", "content": response.content})

            # Check if we just read document content and should prompt for completion
            tools_just_used = [t['tool'] for t in tool_executions[-len(tool_results):]]
            read_doc = 'get_document_content' in tools_just_used

            # If we read a document, check if the user wanted to save data
            user_wants_save = any(kw in user_message.lower() for kw in [
                'extract', 'add', 'save', 'populate', 'update', 'import', 'insert'
            ])
            data_type_requested = None
            if 'rental' in user_message.lower() or 'comp' in user_message.lower():
                data_type_requested = 'rental_comps'
            elif 'expense' in user_message.lower() or 'opex' in user_message.lower() or 't-12' in user_message.lower():
                data_type_requested = 'operating_expenses'

            # If we read a document and user wants to save, add a nudge
            if read_doc and user_wants_save and data_type_requested:
                tool_name = 'update_rental_comps' if data_type_requested == 'rental_comps' else 'update_operating_expenses'
                nudge = f"Now extract the data from the content and call {tool_name} to save it to the database."
                messages.append({"role": "user", "content": tool_results + [{"type": "text", "text": nudge}]})
            else:
                messages.append({"role": "user", "content": tool_results})

            # Continue the conversation
            api_call_start = time.time()
            print(f"[AI_TIMING] Starting Claude API call for iteration {iteration}...")
            response = anthropic.messages.create(
                model=CLAUDE_MODEL,
                max_tokens=4000,  # Increased for tool calls with lots of data
                system=system_prompt,
                messages=messages,
                tools=tools  # Use context-filtered tools
            )
            print(f"[AI_TIMING] Claude API call iteration {iteration}: {time.time() - api_call_start:.2f}s (stop_reason: {response.stop_reason}, tokens: {response.usage.input_tokens} in / {response.usage.output_tokens} out)")
            print(f"[AI_TIMING] Total iteration {iteration} time: {time.time() - iteration_start:.2f}s")

        if iteration > 0:
            print(f"[AI_TIMING] Total tool loop time ({iteration} iterations): {time.time() - total_tool_loop_start:.2f}s")

        # Check if we need to force another iteration to complete the task
        # This handles the case where the model reads a document but ends without saving
        tools_used_names = [t['tool'] for t in tool_executions]
        read_doc = 'get_document_content' in tools_used_names
        saved_data = 'update_rental_comps' in tools_used_names or 'update_operating_expenses' in tools_used_names

        # Detect if user wanted to save data
        user_wants_save = any(kw in user_message.lower() for kw in [
            'extract', 'add', 'save', 'populate', 'update', 'import', 'insert'
        ])
        data_type_requested = None
        if 'rental' in user_message.lower() or 'comp' in user_message.lower():
            data_type_requested = 'rental_comps'
        elif 'expense' in user_message.lower() or 'opex' in user_message.lower() or 't-12' in user_message.lower():
            data_type_requested = 'operating_expenses'

        # If we read a document, user wanted to save, but we didn't save - force continuation
        if read_doc and user_wants_save and data_type_requested and not saved_data and iteration < max_tool_iterations:
            logger.info("Forcing continuation to complete save operation")
            target_tool = 'update_rental_comps' if data_type_requested == 'rental_comps' else 'update_operating_expenses'

            # Get the last document content from tool executions
            doc_content = ""
            for t in reversed(tool_executions):
                if t['tool'] == 'get_document_content' and t.get('result', {}).get('success'):
                    doc_content = t['result'].get('content', '')[:15000]  # Limit size
                    break

            # Build a new request with just the content and direct instruction
            # This avoids the tool_result message format issues
            if data_type_requested == 'operating_expenses':
                continuation_messages = [
                    {
                        "role": "user",
                        "content": f"""Here is the document content with operating expenses:

{doc_content}

Extract ALL operating expense line items explicitly listed in the document.
For each line item, provide:
- label: The exact expense name (e.g., "Real Estate Taxes", "Insurance", "Water & Sewer")
- annual_amount: Annual amount in dollars
- per_unit: Per-unit annual amount if shown
- per_sf: Per-SF annual amount if shown

Do NOT estimate or use industry standards. If a line item is not explicitly listed, omit it.
Call {target_tool} with all the extracted expenses now. Include source_document if known."""
                    }
                ]
                continuation_system = (
                    "You are a data extraction assistant. Extract structured operating expense line items "
                    "from the provided document content and call update_operating_expenses to save them. "
                    "Do not fabricate values."
                )
            else:
                continuation_messages = [
                    {
                        "role": "user",
                        "content": f"""Here is the document content with rental comparable data:

{doc_content}

Extract ALL the rental comparable properties and their unit types from this content.
For each property and unit type combination, create an entry with:
- property_name: The property name
- address: Full street address if shown
- unit_type: e.g., "1BR/1BA", "2BR/2BA", "Studio"
- bedrooms: Number (0 for studio)
- bathrooms: Number
- avg_sqft: Square footage
- asking_rent: Monthly rent in dollars

Call {target_tool} with all the extracted comps now."""
                    }
                ]
                continuation_system = (
                    "You are a data extraction assistant. Extract structured rental comparable data from the "
                    "provided document content and call update_rental_comps to save it."
                )

            # Make a fresh API call with just the content
            response = anthropic.messages.create(
                model=CLAUDE_MODEL,
                max_tokens=8000,
                system=continuation_system,
                messages=continuation_messages,
                tools=tools  # Use context-filtered tools
            )

            # Process any additional tool calls from the continuation
            while response.stop_reason == "tool_use" and iteration < max_tool_iterations:
                iteration += 1
                tool_results = []
                for content_block in response.content:
                    if content_block.type == "tool_use":
                        tool_name_exec = content_block.name
                        tool_input = content_block.input
                        tool_use_id = content_block.id
                        logger.info(f"Executing forced tool: {tool_name_exec}")

                        try:
                            tool_result = execute_tool(
                                tool_name_exec,
                                tool_input,
                                project_id,
                                source_message_id=source_message_id,
                                propose_only=True  # Level 2 autonomy
                            )

                            # Track proposals from forced continuation
                            if tool_result.get('mutation_id') or tool_result.get('batch_id'):
                                mutation_proposals.append(tool_result)

                            tool_executions.append({
                                'tool': tool_name_exec,
                                'input': tool_input,
                                'result': tool_result,
                                'success': tool_result.get('success', not tool_result.get('error')),
                                'is_proposal': bool(tool_result.get('mutation_id') or tool_result.get('batch_id'))
                            })
                            result_content = json.dumps(tool_result, cls=DecimalEncoder)
                        except Exception as tool_error:
                            logger.error(f"Tool execution error: {tool_error}")
                            result_content = json.dumps({'error': str(tool_error)})

                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": tool_use_id,
                            "content": result_content
                        })

                continuation_messages.append({"role": "assistant", "content": response.content})
                continuation_messages.append({"role": "user", "content": tool_results})
                response = anthropic.messages.create(
                    model=CLAUDE_MODEL,
                    max_tokens=2000,
                    system="You are a data extraction assistant.",
                    messages=continuation_messages,
                    tools=tools  # Use context-filtered tools
                )

        # Extract final text response
        ai_content = ""
        for content_block in response.content:
            if hasattr(content_block, 'text'):
                ai_content += content_block.text

        # 6. Extract any suggested values from response
        metadata = _extract_suggestions(ai_content)

        # 7. Get structured data if we matched a DB query with tabular results
        structured_data = None
        data_type = None
        data_title = None
        columns = None

        if rag_context_obj.db_query_type:
            query_result = execute_project_query(project_id, rag_context_obj.db_query_type)
            if not query_result.get('error') and query_result.get('row_count', 0) > 3:
                # Tabular data worth showing in a grid
                structured_data = query_result['rows']
                data_type = 'table'
                data_title = _get_data_title(rag_context_obj.db_query_type)
                columns = _get_column_definitions(rag_context_obj.db_query_type)

        # Determine primary source
        has_project_data = bool(project_context and project_context.strip())
        has_query_result = rag_context_obj.db_query_type is not None
        has_documents = len(rag_context_obj.document_chunks) > 0

        if has_query_result:
            primary_source = 'database_query'
        elif has_project_data:
            primary_source = 'project_data'
        elif has_documents:
            primary_source = 'documents'
        else:
            primary_source = 'general'

        # Add tool execution info to metadata
        if tool_executions:
            metadata['tool_executions'] = tool_executions
            metadata['tools_used'] = [t['tool'] for t in tool_executions]
            metadata['all_tools_succeeded'] = all(t.get('success', False) for t in tool_executions)

        # Add mutation proposals to metadata (Level 2 autonomy)
        if mutation_proposals:
            metadata['mutation_proposals'] = mutation_proposals
            metadata['has_pending_mutations'] = True
            metadata['source_message_id'] = source_message_id
        else:
            metadata['has_pending_mutations'] = False

        return {
            'content': ai_content,
            'metadata': metadata,
            'context_used': {
                'chunks_retrieved': len(rag_context_obj.document_chunks),
                'token_estimate': rag_context_obj.token_estimate,
                'sources': [c.get('doc_name', 'Unknown') for c in rag_context_obj.document_chunks],
                # Track what context was included
                'has_project_context': has_project_data,
                'has_query_result': has_query_result,
                'has_document_chunks': has_documents,
                'db_query_matched': has_query_result,
                'db_query_type': rag_context_obj.db_query_type,
                'sources_used': getattr(rag_context_obj, 'sources_used', []),
                'primary_source': primary_source,
                # Tool execution tracking
                'tools_executed': len(tool_executions),
                'tool_iterations': iteration if 'iteration' in dir() else 0
            },
            # NEW: Structured data for table rendering
            'structured_data': structured_data,
            'data_type': data_type,
            'data_title': data_title,
            'columns': columns,
            'usage': {
                'input_tokens': response.usage.input_tokens,
                'output_tokens': response.usage.output_tokens
            }
        }

    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        logger.error(f"Landscaper AI error: {e}\n{error_traceback}")
        print(f"[LANDSCAPER_ERROR] {e}\n{error_traceback}")
        return {
            'content': f"I apologize, but I encountered an error processing your request. Please try again.",
            'metadata': {'error': str(e), 'traceback': error_traceback},
            'context_used': {},
            'usage': {}
        }


def _build_system_prompt(
    rag_context: RAGContext,
    project_context: str = "",
    tab_context: str = "",
    project_id: Optional[int] = None,
    analysis_context: Optional[str] = None
) -> str:
    """
    Build system prompt with full project context + RAG context + tab context + Entity-Fact knowledge + analysis context.

    Args:
        rag_context: RAG context with document chunks and query results
        project_context: Full structured data context from ProjectContextService
        tab_context: Tab-specific focus instructions
        project_id: Project ID for Entity-Fact knowledge retrieval
        analysis_context: Analysis-specific behavior context (from tbl_analysis_type_config)
    """

    sections = rag_context.to_prompt_sections()

    base_prompt = """You are Landscaper AI, a strategic advisor for real estate development projects. You have deep expertise in:
- Land development and master-planned communities
- Multifamily and commercial real estate analysis
- Market analysis and absorption forecasting
- Financial modeling and feasibility analysis
- Risk assessment and mitigation strategies

Your role is to provide actionable, data-driven guidance. You have access to BOTH structured project data from the database AND content from uploaded documents. Reference specific data when answering.

When suggesting specific numeric values (absorption rates, prices, costs, timelines), be explicit so these can be tracked against the user's actual choices.

=== TOOLS ===

You have tools available to UPDATE project data, not just read it. When the user asks you to change, set, update, or populate a field, USE THE TOOLS. Don't just describe what should be done - actually do it.

Available tools:
- update_project_field: Update a single field (location, market, pricing, etc.)
- bulk_update_fields: Update multiple related fields at once
- get_project_fields: Read current field values before updating
- get_field_schema: Check what fields exist and their constraints
- get_project_documents: List uploaded documents
- get_document_content: Read document content
- get_document_assertions: Get extracted data from documents
- ingest_document: Auto-populate fields from an OM or similar document
- update_operating_expenses: Add/update OpEx line items
- update_rental_comps: Add/update rental comparables from OMs or market research

When to use tools:
- User says "set the city to Phoenix" → use update_project_field
- User says "populate from the OM" → use ingest_document
- User says "add these operating expenses" → use update_operating_expenses
- User says "populate the rental comps" → use update_rental_comps
- User asks "what documents do we have?" → use get_project_documents

IMPORTANT: When user asks to POPULATE or ADD data, ALWAYS use the appropriate tool. Don't just describe the data - actually save it!
- "populate rental comps from the OM" → CALL update_rental_comps with the extracted data
- "add the operating expenses" → CALL update_operating_expenses with the extracted data

=== MULTI-DOCUMENT EXTRACTION HIERARCHY ===

When multiple documents are available for the same property (e.g., OM + Rent Roll + T-12):

**DOCUMENT PRIORITY BY DATA TYPE:**

1. **Rent/Occupancy Data** (Rent Roll wins)
   - Rent Roll → T-12 → OM
   - Rent rolls are updated monthly; treat as source of truth for current rents
   - OMs often contain stale or "proforma" rent figures

2. **Expense/Operating Data** (T-12 wins)
   - T-12 → Appraisal → OM
   - T-12 shows actual historical expenses
   - OM expenses may be "adjusted" or "proforma"

3. **Property Details** (Appraisal/OM wins)
   - Appraisal → OM → Rent Roll
   - Use OM for address, year built, SF, amenities, narrative

4. **Financing/Loan Data** (OM wins)
   - OM → Appraisal → Proforma
   - Assumable debt terms typically in OM

**CONFLICT HANDLING:**
- When rent roll and OM show different rent totals, USE THE RENT ROLL
- Flag discrepancies >5% to the user with both values
- Note the date of each document if available
- Example: "Rent roll shows $86,936/mo (41 occupied units), OM shows $92,958/mo. Using rent roll as current source of truth."

**EXPENSE LABEL NORMALIZATION:**
- Strip GL account codes from labels (e.g., "6320: Insurance" → "Insurance")
- Map common variations (e.g., "R&M" → "Repairs & Maintenance")
- Flag anomalously high expenses (e.g., software >$500/unit/year)"""

    # ANALYSIS CONTEXT: What the user is trying to accomplish
    if analysis_context and analysis_context.strip():
        base_prompt += f"""

=== ANALYSIS TYPE FOCUS ===

{analysis_context}

Tailor your guidance to this analysis type. Emphasize the metrics, approaches, and considerations most relevant to this goal."""

    # TAB CONTEXT: Current UI context the user is viewing
    if tab_context and tab_context.strip():
        base_prompt += f"""

=== CURRENT CONTEXT ===

{tab_context}

Focus your answers on topics relevant to this context. If the user asks about something outside this context, still answer but consider what brought them here."""

    # PRIMARY SOURCE: Full project context (always include if available)
    if project_context and project_context.strip():
        base_prompt += f"""

=== PROJECT DATA (from database) ===

{project_context}

IMPORTANT: This is live, validated project data. Always prefer this structured data over document excerpts when both contain the same information."""

    # ENTITY-FACT KNOWLEDGE: Provenance-tracked facts from knowledge graph
    if project_id:
        try:
            entity_fact_context = get_entity_fact_context(project_id)
            if entity_fact_context and entity_fact_context.strip():
                base_prompt += f"""

=== KNOWLEDGE GRAPH (provenance-tracked assumptions) ===

{entity_fact_context}

Note: These facts have been validated and tracked with full provenance. They show the source of each value (user-entered, extracted from document, AI-suggested, etc.) and confidence levels."""
        except Exception as e:
            logger.warning(f"Failed to retrieve Entity-Fact context for project {project_id}: {e}")

    # QUERY RESULT: Specific database query match (if question matched a pattern)
    if sections.get('db_query_result'):
        base_prompt += f"""

=== QUERY RESULT (specific answer) ===

{sections['db_query_result']}"""

    # DOCUMENT CONTENT: RAG-retrieved document chunks
    if sections.get('document_knowledge'):
        base_prompt += f"""

=== DOCUMENT EXCERPTS (from uploaded files) ===

{sections['document_knowledge']}

When referencing document content, cite the specific document name."""

    # Schema context: What additional data could be queried
    if sections.get('schema_context') and not project_context:
        base_prompt += f"""

=== AVAILABLE DATA TYPES ===

{sections['schema_context']}"""

    # Citation guidance
    citation_hint = rag_context.get_citation_hint() if hasattr(rag_context, 'get_citation_hint') else ""

    base_prompt += """

=== RESPONSE GUIDELINES ===

1. Be direct and actionable - real estate professionals value concise, expert guidance
2. ALWAYS cite your source:
   - For database data: "Based on project data..." or "The project shows..."
   - For documents: "According to [document name]..."
   - For general knowledge: "Based on industry standards..." or acknowledge if you're making an assumption
3. When BOTH database and documents contain the same info, prefer database (it's current)
4. When ONLY documents have the info, use documents and cite them
5. Quantify recommendations when possible (e.g., "target 4-6 units/month absorption")
6. Flag risks and uncertainties proactively
7. Ask clarifying questions if needed to give better advice
8. If you don't have enough information, say so rather than guessing

=== RESPONSE STYLE (CRITICAL) ===

- Do NOT narrate your thinking process to the user
- Do NOT say "Let me check...", "I'll analyze...", "Now I will...", "First, I'll..."
- Do NOT describe what tools you're using or what you're looking up
- Do NOT use phrases like "I notice that...", "I can see that...", "Looking at..."
- Go DIRECTLY to the answer or analysis
- If showing your reasoning, use clear section headers, not narration
- Do NOT use markdown formatting (no **, ##, ```, etc.) - responses are displayed as plain text

BAD: "Let me check the rent roll data. I see that Unit 213 has a rent of $1,716."
GOOD: "Unit 213 shows a rent of $1,716, which is 30% below market."

BAD: "I'll analyze this by looking at three factors. First, I notice the lease vintage..."
GOOD: "Three factors explain the rent gap:\n1. Lease vintage - older leases locked in lower rates"

BAD: "## Analysis\n**Key Finding:** The cap rate is 5.2%"
GOOD: "Key Finding: The cap rate is 5.2%"
"""

    if citation_hint:
        base_prompt += f"\n9. For this query, your primary source is: {citation_hint}"

    return base_prompt


def _extract_suggestions(ai_response: str) -> Dict[str, Any]:
    """
    Extract suggested values from AI response for advice tracking.

    Looks for patterns like:
    - "I recommend 48 units per year"
    - "target absorption of 4-6 units/month"
    - "price at $85,000 per lot"
    """
    suggestions = {}

    # Absorption rate patterns
    absorption_patterns = [
        r'(\d+(?:-\d+)?)\s*units?\s*per\s*(year|month|quarter)',
        r'absorption\s*(?:rate\s*)?(?:of\s*)?(\d+(?:-\d+)?)\s*units?',
    ]

    for pattern in absorption_patterns:
        match = re.search(pattern, ai_response, re.IGNORECASE)
        if match:
            suggestions['absorption_rate'] = match.group(0)
            break

    # Price patterns
    price_patterns = [
        r'\$(\d{1,3}(?:,\d{3})*)\s*per\s*(lot|unit|acre|sf|sqft)',
        r'price\s*(?:at\s*)?\$(\d{1,3}(?:,\d{3})*)',
    ]

    for pattern in price_patterns:
        match = re.search(pattern, ai_response, re.IGNORECASE)
        if match:
            suggestions['pricing'] = match.group(0)
            break

    # Timeline patterns
    timeline_patterns = [
        r'(\d+(?:-\d+)?)\s*(months?|years?)\s*(?:to\s*)?(?:complete|finish|build)',
        r'timeline\s*(?:of\s*)?(\d+(?:-\d+)?)\s*(months?|years?)',
    ]

    for pattern in timeline_patterns:
        match = re.search(pattern, ai_response, re.IGNORECASE)
        if match:
            suggestions['timeline'] = match.group(0)
            break

    return {
        'suggested_values': suggestions,
        'has_suggestions': len(suggestions) > 0
    }


def save_chat_message(
    project_id: int,
    role: str,
    content: str,
    metadata: Dict = None,
    user_id: int = None
) -> Optional[str]:
    """
    Save a chat message to the database.

    Args:
        project_id: Project ID
        role: 'user' or 'assistant'
        content: Message content
        metadata: Optional metadata (suggestions, context, etc.)
        user_id: Optional user ID

    Returns:
        Message ID
    """
    import json

    message_id = f"msg_{uuid.uuid4().hex[:12]}"

    with connection.cursor() as cursor:
        cursor.execute("""
            INSERT INTO landscape.landscaper_chat_message
            (message_id, project_id, role, content, metadata, timestamp, user_id)
            VALUES (%s, %s, %s, %s, %s, NOW(), %s)
            RETURNING message_id
        """, [
            message_id,
            project_id,
            role,
            content,
            json.dumps(metadata) if metadata else None,
            user_id
        ])

        row = cursor.fetchone()
        return row[0] if row else None


def _get_data_title(query_type: str) -> str:
    """Get human-readable title for structured data display."""
    titles = {
        'land_use_pricing': 'Land Use Pricing',
        'budget_total': 'Budget Summary',
        'budget_by_category': 'Budget by Category',
        'budget_by_activity': 'Budget by Activity',
        'parcel_count': 'Parcel Count',
        'parcel_summary': 'Parcel Summary',
        'parcel_by_type': 'Parcels by Type',
        'container_summary': 'Project Structure',
        'area_list': 'Project Areas',
        'phase_list': 'Project Phases',
        'project_details': 'Project Details',
    }
    return titles.get(query_type, 'Data')


def _get_column_definitions(query_type: str) -> List[Dict[str, Any]]:
    """Return column config for table rendering."""
    columns = {
        'land_use_pricing': [
            {'key': 'lu_type_code', 'label': 'Land Use', 'width': 100},
            {'key': 'product_code', 'label': 'Product', 'width': 120},
            {'key': 'price_per_unit', 'label': 'Price', 'width': 100, 'format': 'currency'},
            {'key': 'unit_of_measure', 'label': 'Unit', 'width': 80},
            {'key': 'growth_rate', 'label': 'Growth', 'width': 80, 'format': 'percent'},
        ],
        'budget_by_category': [
            {'key': 'category', 'label': 'Category', 'width': 200},
            {'key': 'total', 'label': 'Amount', 'width': 120, 'format': 'currency'},
            {'key': 'items', 'label': 'Items', 'width': 80, 'format': 'number'},
        ],
        'budget_by_activity': [
            {'key': 'activity', 'label': 'Activity', 'width': 150},
            {'key': 'total', 'label': 'Amount', 'width': 120, 'format': 'currency'},
            {'key': 'items', 'label': 'Items', 'width': 80, 'format': 'number'},
        ],
        'parcel_summary': [
            {'key': 'parcel_count', 'label': 'Parcels', 'width': 100, 'format': 'number'},
            {'key': 'total_units', 'label': 'Units', 'width': 100, 'format': 'number'},
            {'key': 'total_acres', 'label': 'Acres', 'width': 100, 'format': 'decimal'},
        ],
        'parcel_by_type': [
            {'key': 'type_code', 'label': 'Type', 'width': 120},
            {'key': 'count', 'label': 'Parcels', 'width': 80, 'format': 'number'},
            {'key': 'total_units', 'label': 'Units', 'width': 100, 'format': 'number'},
            {'key': 'total_acres', 'label': 'Acres', 'width': 100, 'format': 'decimal'},
        ],
        'container_summary': [
            {'key': 'level_name', 'label': 'Level', 'width': 150},
            {'key': 'count', 'label': 'Count', 'width': 100, 'format': 'number'},
        ],
        'area_list': [
            {'key': 'area_alias', 'label': 'Area', 'width': 150},
            {'key': 'phase_count', 'label': 'Phases', 'width': 80, 'format': 'number'},
            {'key': 'parcel_count', 'label': 'Parcels', 'width': 80, 'format': 'number'},
        ],
        'phase_list': [
            {'key': 'phase_name', 'label': 'Phase', 'width': 150},
            {'key': 'area_name', 'label': 'Area', 'width': 120},
            {'key': 'phase_status', 'label': 'Status', 'width': 100},
            {'key': 'parcel_count', 'label': 'Parcels', 'width': 80, 'format': 'number'},
        ],
    }
    return columns.get(query_type, [])
