"""
Block-document validation for generative artifacts.

The artifact schema vocabulary (spec §7.1) is intentionally small:
section, table, key_value_grid, text. This module rejects malformed
schemas at the API boundary so we never persist garbage that the
frontend renderer would silently drop.

Strict by design — Phase 1 keeps the surface area tight; Phase 2 may
relax for unknown blocks (the renderer is also strict).
"""

from typing import Any


_VALID_BLOCK_TYPES = {'section', 'table', 'key_value_grid', 'text'}
_VALID_TEXT_VARIANTS = {'body', 'caption', 'callout', None}
_VALID_ALIGNMENTS = {'left', 'right', 'center', None}


class SchemaValidationError(ValueError):
    """Raised when the block document fails validation."""


def validate_block_document(doc: Any) -> None:
    """Validate a block document. Raises SchemaValidationError on failure.

    The document is `{"blocks": [Block, ...]}`. Each Block must match one
    of the four supported block types. SourceRef shapes (per row/cell)
    are checked when present; their absence just disables drift detection.
    """
    if not isinstance(doc, dict):
        raise SchemaValidationError('schema must be an object')
    blocks = doc.get('blocks')
    if not isinstance(blocks, list):
        raise SchemaValidationError("schema.blocks must be an array")
    seen_ids: set = set()
    for i, block in enumerate(blocks):
        _validate_block(block, path=f'blocks[{i}]', seen_ids=seen_ids)


def _validate_block(block: Any, path: str, seen_ids: set) -> None:
    if not isinstance(block, dict):
        raise SchemaValidationError(f'{path} must be an object')
    btype = block.get('type')
    if btype not in _VALID_BLOCK_TYPES:
        raise SchemaValidationError(
            f"{path}.type must be one of {sorted(_VALID_BLOCK_TYPES)}, got {btype!r}"
        )
    bid = block.get('id')
    if not isinstance(bid, str) or not bid:
        raise SchemaValidationError(f'{path}.id is required (non-empty string)')
    if bid in seen_ids:
        raise SchemaValidationError(f'{path}.id {bid!r} duplicates an earlier block id')
    seen_ids.add(bid)

    if btype == 'section':
        _validate_section(block, path, seen_ids)
    elif btype == 'table':
        _validate_table(block, path)
    elif btype == 'key_value_grid':
        _validate_kv_grid(block, path)
    elif btype == 'text':
        _validate_text(block, path)


def _validate_section(block: dict, path: str, seen_ids: set) -> None:
    if not isinstance(block.get('title'), str):
        raise SchemaValidationError(f'{path}.title is required (string)')
    children = block.get('children')
    if not isinstance(children, list):
        raise SchemaValidationError(f'{path}.children must be an array')
    for i, child in enumerate(children):
        _validate_block(child, path=f'{path}.children[{i}]', seen_ids=seen_ids)


def _validate_table(block: dict, path: str) -> None:
    columns = block.get('columns')
    if not isinstance(columns, list) or not columns:
        raise SchemaValidationError(f'{path}.columns must be a non-empty array')
    column_keys = set()
    for i, col in enumerate(columns):
        if not isinstance(col, dict):
            raise SchemaValidationError(f'{path}.columns[{i}] must be an object')
        key = col.get('key')
        if not isinstance(key, str) or not key:
            raise SchemaValidationError(f'{path}.columns[{i}].key is required')
        column_keys.add(key)
        if not isinstance(col.get('label'), str):
            raise SchemaValidationError(f'{path}.columns[{i}].label is required')
        align = col.get('align')
        if align is not None and align not in _VALID_ALIGNMENTS:
            raise SchemaValidationError(
                f'{path}.columns[{i}].align must be one of left|right|center'
            )

    rows = block.get('rows')
    if not isinstance(rows, list):
        raise SchemaValidationError(f'{path}.rows must be an array (empty allowed)')
    seen_row_ids: set = set()
    for i, row in enumerate(rows):
        if not isinstance(row, dict):
            raise SchemaValidationError(f'{path}.rows[{i}] must be an object')
        rid = row.get('id')
        if not isinstance(rid, str) or not rid:
            raise SchemaValidationError(f'{path}.rows[{i}].id is required')
        if rid in seen_row_ids:
            raise SchemaValidationError(f'{path}.rows[{i}].id {rid!r} duplicates an earlier row')
        seen_row_ids.add(rid)
        cells = row.get('cells')
        if not isinstance(cells, dict):
            raise SchemaValidationError(f'{path}.rows[{i}].cells must be an object')
        sref = row.get('source_ref')
        if sref is not None:
            _validate_source_ref(sref, f'{path}.rows[{i}].source_ref')
        cell_refs = row.get('cell_source_refs')
        if cell_refs is not None:
            if not isinstance(cell_refs, dict):
                raise SchemaValidationError(
                    f'{path}.rows[{i}].cell_source_refs must be an object'
                )
            for col_key, ref in cell_refs.items():
                if col_key not in column_keys:
                    raise SchemaValidationError(
                        f'{path}.rows[{i}].cell_source_refs.{col_key} '
                        f'references unknown column'
                    )
                _validate_source_ref(
                    ref, f'{path}.rows[{i}].cell_source_refs.{col_key}'
                )


def _validate_kv_grid(block: dict, path: str) -> None:
    pairs = block.get('pairs')
    if not isinstance(pairs, list):
        raise SchemaValidationError(f'{path}.pairs must be an array')
    columns = block.get('columns')
    if columns is not None and not (isinstance(columns, int) and columns > 0):
        raise SchemaValidationError(f'{path}.columns must be a positive integer')
    for i, pair in enumerate(pairs):
        if not isinstance(pair, dict):
            raise SchemaValidationError(f'{path}.pairs[{i}] must be an object')
        if not isinstance(pair.get('label'), str):
            raise SchemaValidationError(f'{path}.pairs[{i}].label is required')
        if 'value' not in pair:
            raise SchemaValidationError(f'{path}.pairs[{i}].value is required')
        sref = pair.get('source_ref')
        if sref is not None:
            _validate_source_ref(sref, f'{path}.pairs[{i}].source_ref')


def _validate_text(block: dict, path: str) -> None:
    content = block.get('content')
    if not isinstance(content, str):
        raise SchemaValidationError(f'{path}.content is required (string)')
    variant = block.get('variant')
    if variant is not None and variant not in _VALID_TEXT_VARIANTS:
        raise SchemaValidationError(
            f'{path}.variant must be one of body|caption|callout'
        )


def _validate_source_ref(ref: Any, path: str) -> None:
    if not isinstance(ref, dict):
        raise SchemaValidationError(f'{path} must be an object')
    if not isinstance(ref.get('table'), str) or not ref['table']:
        raise SchemaValidationError(f'{path}.table is required')
    rid = ref.get('row_id')
    if not isinstance(rid, (int, str)) or rid == '':
        raise SchemaValidationError(f'{path}.row_id is required (int or string)')
    if not isinstance(ref.get('captured_at'), str) or not ref['captured_at']:
        raise SchemaValidationError(f'{path}.captured_at is required (ISO timestamp)')


_VALID_PATCH_OPS = {'add', 'remove', 'replace', 'move', 'copy', 'test'}


def apply_json_patch(document: Any, patch: list) -> Any:
    """Apply an RFC-6902 JSON Patch to `document` and return the result.

    Minimal in-tree implementation — keeps Phase 1 dependency-free. Supports
    add, remove, replace, move, copy, test. Raises SchemaValidationError on
    any malformed op or path that doesn't resolve.
    """
    import copy as _copy
    if not isinstance(patch, list):
        raise SchemaValidationError('schema_diff must be an array of JSON Patch ops')
    doc = _copy.deepcopy(document)
    for i, op_obj in enumerate(patch):
        if not isinstance(op_obj, dict):
            raise SchemaValidationError(f'schema_diff[{i}] must be an object')
        op = op_obj.get('op')
        if op not in _VALID_PATCH_OPS:
            raise SchemaValidationError(
                f'schema_diff[{i}].op must be one of {sorted(_VALID_PATCH_OPS)}'
            )
        path = op_obj.get('path')
        if not isinstance(path, str):
            raise SchemaValidationError(f'schema_diff[{i}].path is required (string)')
        if op == 'add':
            doc = _patch_add(doc, _split_path(path), op_obj.get('value'))
        elif op == 'remove':
            doc = _patch_remove(doc, _split_path(path))
        elif op == 'replace':
            doc = _patch_remove(doc, _split_path(path))
            doc = _patch_add(doc, _split_path(path), op_obj.get('value'))
        elif op == 'test':
            actual = _patch_get(doc, _split_path(path))
            if actual != op_obj.get('value'):
                raise SchemaValidationError(
                    f'schema_diff[{i}] test failed at {path}'
                )
        elif op in ('move', 'copy'):
            from_path = op_obj.get('from')
            if not isinstance(from_path, str):
                raise SchemaValidationError(
                    f'schema_diff[{i}].from is required for {op}'
                )
            value = _patch_get(doc, _split_path(from_path))
            if op == 'move':
                doc = _patch_remove(doc, _split_path(from_path))
            doc = _patch_add(doc, _split_path(path), value)
    return doc


def _split_path(path: str) -> list:
    if path == '':
        return []
    if not path.startswith('/'):
        raise SchemaValidationError(f'JSON Patch path must start with /: {path}')
    return [
        token.replace('~1', '/').replace('~0', '~')
        for token in path[1:].split('/')
    ]


def _patch_get(doc: Any, tokens: list) -> Any:
    cur = doc
    for tok in tokens:
        if isinstance(cur, list):
            try:
                cur = cur[int(tok)]
            except (ValueError, IndexError):
                raise SchemaValidationError(f'JSON Patch path token {tok!r} invalid')
        elif isinstance(cur, dict):
            if tok not in cur:
                raise SchemaValidationError(f'JSON Patch path missing {tok!r}')
            cur = cur[tok]
        else:
            raise SchemaValidationError(f'JSON Patch traversal hit non-container at {tok!r}')
    return cur


def _patch_add(doc: Any, tokens: list, value: Any) -> Any:
    if not tokens:
        return value
    parent = _patch_get(doc, tokens[:-1])
    last = tokens[-1]
    if isinstance(parent, list):
        if last == '-':
            parent.append(value)
        else:
            parent.insert(int(last), value)
    elif isinstance(parent, dict):
        parent[last] = value
    else:
        raise SchemaValidationError(f'JSON Patch add target not a container at {last!r}')
    return doc


def _patch_remove(doc: Any, tokens: list) -> Any:
    if not tokens:
        raise SchemaValidationError('JSON Patch remove requires a non-empty path')
    parent = _patch_get(doc, tokens[:-1])
    last = tokens[-1]
    if isinstance(parent, list):
        try:
            parent.pop(int(last))
        except (ValueError, IndexError):
            raise SchemaValidationError(f'JSON Patch remove path {last!r} invalid for array')
    elif isinstance(parent, dict):
        if last not in parent:
            raise SchemaValidationError(f'JSON Patch remove path {last!r} missing')
        del parent[last]
    else:
        raise SchemaValidationError(f'JSON Patch remove target not a container')
    return doc
