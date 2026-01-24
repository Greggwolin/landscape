"""
Landscaper Service (Stub)

Returns mock review responses for Phase 3 UI wiring.
"""

import time
import re
import copy

from apps.valuation.models import NarrativeVersion


class LandscaperService:
    @staticmethod
    def _escape_html(text: str) -> str:
        return (
            text.replace('&', '&amp;')
            .replace('<', '&lt;')
            .replace('>', '&gt;')
            .replace('"', '&quot;')
            .replace("'", '&#39;')
        )

    @staticmethod
    def _strip_bracketed(text: str) -> str:
        return re.sub(r'\[.*?\]', '', text).strip()

    @staticmethod
    def _normalize_text(text: str) -> str:
        normalized = re.sub(r'\s+', ' ', text.strip().strip('[]'))
        return normalized.lower()

    @staticmethod
    def _extract_inline_comment_texts(content: dict | list | None) -> list[str]:
        if not content:
            return []

        texts: list[str] = []

        def walk(node):
            if isinstance(node, dict):
                if node.get('type') == 'inlineComment':
                    attrs = node.get('attrs') or {}
                    text = (attrs.get('text') or '').strip()
                    if text:
                        texts.append(text)
                for value in node.values():
                    walk(value)
            elif isinstance(node, list):
                for item in node:
                    walk(item)

        walk(content)
        return texts

    @staticmethod
    def _collect_excluded_texts(version: NarrativeVersion) -> set[str]:
        excluded = set()

        for comment in version.comments.filter(is_resolved=False):
            if comment.comment_text:
                excluded.add(LandscaperService._normalize_text(comment.comment_text))

        for text in LandscaperService._extract_inline_comment_texts(version.content):
            excluded.add(LandscaperService._normalize_text(text))

        content_plain = version.content_plain or ''
        for item in re.findall(r'\[(.*?)\]', content_plain):
            text = item.strip()
            if text:
                excluded.add(LandscaperService._normalize_text(text))

        return {text for text in excluded if text}

    @staticmethod
    def _parse_currency(value: str) -> float:
        normalized = value.replace('$', '').replace(',', '').strip()
        try:
            return float(normalized)
        except ValueError:
            return 0.0

    @staticmethod
    def _format_currency(value: float) -> str:
        return f'${value:,.0f}'

    @staticmethod
    def _apply_parenthetical_total(version: NarrativeVersion) -> tuple[dict | None, str | None]:
        content_plain = version.content_plain or ''
        range_match = re.search(
            r'value range is \$([0-9,]+(?:\.\d+)?) to \$([0-9,]+(?:\.\d+)?) per unit',
            content_plain,
            re.IGNORECASE,
        )
        total_match = re.search(
            r'indicated value .*? is \$([0-9,]+(?:\.\d+)?)',
            content_plain,
            re.IGNORECASE,
        )
        if not range_match or not total_match:
            return None, None

        low = LandscaperService._parse_currency(range_match.group(1))
        high = LandscaperService._parse_currency(range_match.group(2))
        total_value = LandscaperService._parse_currency(total_match.group(1))
        if not low or not high or not total_value:
            return None, None

        midpoint = (low + high) / 2
        if midpoint <= 0:
            return None, None

        units = max(int(round(total_value / midpoint)), 1)
        total_low = low * units
        total_high = high * units
        parenthetical = f' ({LandscaperService._format_currency(total_low)} to {LandscaperService._format_currency(total_high)} total dollars)'

        original_sentence = range_match.group(0)
        if parenthetical.strip() in original_sentence:
            return None, None

        updated_sentence = original_sentence + parenthetical

        updated_content = copy.deepcopy(version.content)
        replaced = False

        def walk(node):
            nonlocal replaced
            if isinstance(node, dict):
                if node.get('type') == 'text' and isinstance(node.get('text'), str):
                    if original_sentence in node['text']:
                        node['text'] = node['text'].replace(original_sentence, updated_sentence)
                        replaced = True
                for value in node.values():
                    walk(value)
            elif isinstance(node, list):
                for item in node:
                    walk(item)

        walk(updated_content)

        if not replaced:
            return None, None

        preview_html = (
            '<p>…'
            f'{LandscaperService._escape_html(original_sentence)}'
            f'<span class="track-change-addition">{LandscaperService._escape_html(parenthetical)}</span>'
            '…</p>'
        )
        return updated_content, preview_html

    @staticmethod
    def _build_preview_html(version: NarrativeVersion, excluded_texts: set[str]) -> str:
        changes = list(version.changes.all().order_by('position_start'))
        if not changes:
            return ''

        content_plain = version.content_plain or ''
        preview_parts = []
        for change in changes:
            if content_plain:
                start = max(change.position_start - 40, 0)
                end = min(change.position_end + 40, len(content_plain))
                context_before = content_plain[start:change.position_start]
                context_after = content_plain[change.position_end:end]
            else:
                context_before = ''
                context_after = ''

            if change.change_type == 'deletion':
                original_text = LandscaperService._strip_bracketed(change.original_text or '')
                if not original_text:
                    continue
                normalized = LandscaperService._normalize_text(original_text)
                if normalized in excluded_texts:
                    continue
                preview_parts.append(
                    '<p>…'
                    f'{LandscaperService._escape_html(context_before)}'
                    f'<span class="track-change-deletion">{LandscaperService._escape_html(original_text)}</span>'
                    f'{LandscaperService._escape_html(context_after)}'
                    '…</p>'
                )
            elif change.change_type == 'addition':
                new_text = LandscaperService._strip_bracketed(change.new_text or '')
                if not new_text:
                    continue
                normalized = LandscaperService._normalize_text(new_text)
                if normalized in excluded_texts:
                    continue
                preview_parts.append(
                    '<p>…'
                    f'{LandscaperService._escape_html(context_before)}'
                    f'<span class="track-change-addition">{LandscaperService._escape_html(new_text)}</span>'
                    f'{LandscaperService._escape_html(context_after)}'
                    '…</p>'
                )

        cleaned_preview = ''.join(part for part in preview_parts if part).strip()
        return cleaned_preview

    @staticmethod
    def _extract_prompts(version: NarrativeVersion) -> list[str]:
        prompts: list[str] = []

        for comment in version.comments.filter(is_resolved=False):
            if comment.comment_text:
                prompts.append(comment.comment_text.strip())

        for text in LandscaperService._extract_inline_comment_texts(version.content):
            if text:
                prompts.append(text)

        content_plain = version.content_plain or ''
        bracketed = re.findall(r'\[(.*?)\]', content_plain)
        for item in bracketed:
            text = item.strip()
            if text:
                prompts.append(text)

        deduped = []
        seen = set()
        for prompt in prompts:
            key = prompt.lower()
            if key in seen:
                continue
            seen.add(key)
            deduped.append(prompt)

        return deduped

    @staticmethod
    def _mock_answer(question: str) -> str:
        cleaned = question.strip('[]').strip()
        if cleaned.endswith('?'):
            cleaned = cleaned[:-1]
        cleaned = cleaned.strip()

        is_question = question.strip().endswith('?')
        base = (
            f'You asked about {cleaned}. '
            if is_question
            else f'You noted: {cleaned}. '
        )
        base += 'I drafted expanded commentary to address that point.'

        lowered = cleaned.lower()
        if 'comp' in lowered or 'adjust' in lowered:
            return (
                f'{base} I added comp-by-comp rationale explaining why certain '
                'adjustments were applied and why others were not, including '
                'a +5% location adjustment example versus a no-change comp.'
            )

        if 'narrative' in lowered:
            return (
                f'{base} I expanded the narrative sections with clearer '
                'adjustment reasoning and supporting market context.'
            )

        return (
            f'{base} I included supporting context and a short explanation of '
            'the rationale so it reads clearly in the final report.'
        )

    @staticmethod
    def review_changes(version_id: int) -> dict:
        """
        Stubbed Landscaper review.
        In production, this calls the AI service.
        """
        time.sleep(2)
        version = NarrativeVersion.objects.get(id=version_id)
        prompts = LandscaperService._extract_prompts(version)

        responses = []
        for question in prompts:
            responses.append({
                'question': question,
                'answer': LandscaperService._mock_answer(question),
            })

        suggested_content = version.content
        suggested_preview_html = ''
        suggested_edits = []

        instructions = [prompt for prompt in prompts if not prompt.strip().endswith('?')]
        if instructions:
            instruction_text = ' '.join(instructions).lower()
            if any(
                keyword in instruction_text
                for keyword in ['parenthetical', 'parenthetically', 'total dollar', 'whole dollar', 'value range']
            ):
                updated_content, instruction_preview = LandscaperService._apply_parenthetical_total(version)
                if updated_content and instruction_preview:
                    suggested_content = updated_content
                    suggested_preview_html = instruction_preview
                    suggested_edits = [
                        {
                            'description': 'Added parenthetical total dollar range',
                            'preview': 'Updated value range sentence per your note.',
                        },
                    ]

        if suggested_preview_html and not suggested_edits:
            suggested_edits = [
                {
                    'description': 'Suggested text revisions prepared',
                    'preview': 'Preview reflects Landscaper edits.',
                },
            ]

        return {
            'status': 'ready',
            'message': (
                'I reviewed your updates and drafted responses to the questions you raised.'
                if responses
                else 'I reviewed your updates and added a few refinements.'
            ),
            'questions_answered': responses,
            'suggested_edits': suggested_edits,
            'suggested_preview_html': suggested_preview_html or None,
            'suggested_content': suggested_content,
        }

    @staticmethod
    def review_follow_up(version_id: int | None, message: str) -> dict:
        preview_html = ''

        answer = LandscaperService._mock_answer(message)

        return {
            'status': 'ready',
            'message': 'Follow-up response drafted based on your question.',
            'questions_answered': [
                {
                    'question': message,
                    'answer': answer,
                }
            ],
            'suggested_edits': [],
            'suggested_preview_html': None,
        }
