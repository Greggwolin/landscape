#!/usr/bin/env tsx
"use strict";
/**
 * Seed the Red Valley Ranch unit cost templates into the global library.
 *
 * Usage:
 *   npm run seed:unitcosts:redvalley
 *
 * Requirements:
 *   - DATABASE_URL must be set (e.g., via .env.local)
 *   - Migration 014 must be applied
 */
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
var promises_1 = require("fs/promises");
var path_1 = require("path");
var url_1 = require("url");
var dotenv_1 = require("dotenv");
var serverless_1 = require("@neondatabase/serverless");
var __filename = (0, url_1.fileURLToPath)(import.meta.url);
var __dirname = (0, path_1.dirname)(__filename);
var projectRoot = (0, path_1.resolve)(__dirname, '..');
dotenv_1.default.config({ path: (0, path_1.join)(projectRoot, '.env.local') });
var databaseUrl = (_a = process.env.DATABASE_URL) !== null && _a !== void 0 ? _a : process.env.POSTGRES_URL;
if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set. Configure it in the environment or .env.local.');
    process.exit(1);
}
var sql = (0, serverless_1.neon)(databaseUrl);
function parseCsv(content) {
    var lines = content.trim().split(/\r?\n/);
    if (lines.length <= 1)
        return [];
    var headers = splitCsvLine(lines[0]);
    var records = [];
    var _loop_1 = function (idx) {
        var line = lines[idx];
        if (!line.trim())
            return "continue";
        var values = splitCsvLine(line);
        var record = {};
        headers.forEach(function (header, headerIdx) {
            var _a;
            record[header] = (_a = values[headerIdx]) !== null && _a !== void 0 ? _a : '';
        });
        records.push(record);
    };
    for (var idx = 1; idx < lines.length; idx += 1) {
        _loop_1(idx);
    }
    return records;
}
function splitCsvLine(line) {
    var values = [];
    var current = '';
    var inQuotes = false;
    for (var i = 0; i < line.length; i += 1) {
        var char = line[i];
        if (char === '"' && line[i - 1] !== '\\') {
            inQuotes = !inQuotes;
            continue;
        }
        if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
            continue;
        }
        current += char;
    }
    values.push(current.trim());
    return values.map(function (value) { return value.replace(/\\"/g, '"'); });
}
function normalizeUom(value) {
    var normalized = value.trim();
    if (!normalized)
        return normalized;
    var upper = normalized.toUpperCase().replace(/\./g, '');
    switch (upper) {
        case 'DAY':
        case 'DAYS':
            return 'DAY';
        case 'WK':
        case 'WEEK':
            return 'WK';
        case 'MONTH':
        case 'MO':
            return 'MO';
        case 'YEAR':
        case 'YR':
            return 'YR';
        case 'PCT':
        case 'PERCENT':
        case '%':
            return '%';
        default:
            return upper;
    }
}
function parseNumeric(value) {
    var cleaned = value.trim();
    if (!cleaned)
        return null;
    var parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
}
function parseInteger(value) {
    var cleaned = value.trim();
    if (!cleaned)
        return null;
    var parsed = Number.parseInt(cleaned, 10);
    return Number.isFinite(parsed) ? parsed : null;
}
function hydrateRecord(raw) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    return {
        categoryName: (_b = (_a = raw.category_name) === null || _a === void 0 ? void 0 : _a.trim()) !== null && _b !== void 0 ? _b : '',
        itemName: (_d = (_c = raw.item_name) === null || _c === void 0 ? void 0 : _c.trim()) !== null && _d !== void 0 ? _d : '',
        defaultUom: normalizeUom((_e = raw.default_uom) !== null && _e !== void 0 ? _e : ''),
        quantity: parseNumeric((_f = raw.quantity) !== null && _f !== void 0 ? _f : ''),
        typicalMidValue: parseNumeric((_g = raw.typical_mid) !== null && _g !== void 0 ? _g : ''),
        marketGeography: 'Maricopa, AZ',
        source: 'Copper Nail Development',
        asOfDate: '2024-10-01',
        projectTypeCode: ((_h = raw.project_type_code) !== null && _h !== void 0 ? _h : '').trim().toUpperCase() || 'LAND',
        usageCount: 0,
        createdFromProjectId: parseInteger((_j = raw.created_from_project_id) !== null && _j !== void 0 ? _j : '')
    };
}
function loadCsvRecords() {
    return __awaiter(this, void 0, void 0, function () {
        var csvPath, csvContent, parsed, hydrated;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    csvPath = (0, path_1.join)(projectRoot, 'data', 'red_valley_unit_costs.csv');
                    return [4 /*yield*/, (0, promises_1.readFile)(csvPath, 'utf8')];
                case 1:
                    csvContent = _a.sent();
                    parsed = parseCsv(csvContent);
                    hydrated = parsed
                        .map(hydrateRecord)
                        .filter(function (record) { return record.categoryName && record.itemName && record.defaultUom; });
                    if (hydrated.length === 0) {
                        console.warn('⚠️  No valid records found in red_valley_unit_costs.csv');
                    }
                    return [2 /*return*/, hydrated];
            }
        });
    });
}
function fetchCategoryMap(categoryNames) {
    return __awaiter(this, void 0, void 0, function () {
        var rows, map, _i, rows_1, row;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (categoryNames.length === 0)
                        return [2 /*return*/, new Map()];
                    return [4 /*yield*/, sql(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n    SELECT category_id, category_name\n    FROM landscape.core_unit_cost_category\n    WHERE cost_scope = 'development'\n      AND category_name = ANY(", ")\n  "], ["\n    SELECT category_id, category_name\n    FROM landscape.core_unit_cost_category\n    WHERE cost_scope = 'development'\n      AND category_name = ANY(", ")\n  "])), categoryNames)];
                case 1:
                    rows = _a.sent();
                    map = new Map();
                    for (_i = 0, rows_1 = rows; _i < rows_1.length; _i++) {
                        row = rows_1[_i];
                        map.set(row.category_name, Number(row.category_id));
                    }
                    return [2 /*return*/, map];
            }
        });
    });
}
function seedTemplates() {
    return __awaiter(this, void 0, void 0, function () {
        var records, categoryNames, categoryMap, missingCategories, inserted, updated, _i, records_1, record, categoryId, upsertResult, wasInserted;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, loadCsvRecords()];
                case 1:
                    records = _b.sent();
                    if (records.length === 0)
                        return [2 /*return*/];
                    categoryNames = Array.from(new Set(records.map(function (record) { return record.categoryName; })));
                    return [4 /*yield*/, fetchCategoryMap(categoryNames)];
                case 2:
                    categoryMap = _b.sent();
                    missingCategories = categoryNames.filter(function (name) { return !categoryMap.has(name); });
                    if (missingCategories.length > 0) {
                        console.error("\u274C Missing categories in core_unit_cost_category: ".concat(missingCategories.join(', '), ". Run migration 014 first."));
                        process.exit(1);
                    }
                    inserted = 0;
                    updated = 0;
                    _i = 0, records_1 = records;
                    _b.label = 3;
                case 3:
                    if (!(_i < records_1.length)) return [3 /*break*/, 6];
                    record = records_1[_i];
                    categoryId = categoryMap.get(record.categoryName);
                    if (!categoryId)
                        return [3 /*break*/, 5];
                    return [4 /*yield*/, sql(templateObject_2 || (templateObject_2 = __makeTemplateObject(["\n      INSERT INTO landscape.core_unit_cost_template (\n        category_id,\n        item_name,\n        default_uom_code,\n        quantity,\n        typical_mid_value,\n        market_geography,\n        source,\n        as_of_date,\n        project_type_code,\n        usage_count,\n        created_from_project_id\n      )\n      VALUES (\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", "\n      )\n      ON CONFLICT (category_id, item_name, default_uom_code, project_type_code, market_geography)\n      DO UPDATE SET\n        typical_mid_value = EXCLUDED.typical_mid_value,\n        quantity = EXCLUDED.quantity,\n        default_uom_code = EXCLUDED.default_uom_code,\n        source = EXCLUDED.source,\n        as_of_date = EXCLUDED.as_of_date,\n        usage_count = EXCLUDED.usage_count,\n        created_from_project_id = EXCLUDED.created_from_project_id,\n        is_active = TRUE,\n        updated_at = NOW()\n      RETURNING template_id, (xmax = 0) AS inserted\n    "], ["\n      INSERT INTO landscape.core_unit_cost_template (\n        category_id,\n        item_name,\n        default_uom_code,\n        quantity,\n        typical_mid_value,\n        market_geography,\n        source,\n        as_of_date,\n        project_type_code,\n        usage_count,\n        created_from_project_id\n      )\n      VALUES (\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", "\n      )\n      ON CONFLICT (category_id, item_name, default_uom_code, project_type_code, market_geography)\n      DO UPDATE SET\n        typical_mid_value = EXCLUDED.typical_mid_value,\n        quantity = EXCLUDED.quantity,\n        default_uom_code = EXCLUDED.default_uom_code,\n        source = EXCLUDED.source,\n        as_of_date = EXCLUDED.as_of_date,\n        usage_count = EXCLUDED.usage_count,\n        created_from_project_id = EXCLUDED.created_from_project_id,\n        is_active = TRUE,\n        updated_at = NOW()\n      RETURNING template_id, (xmax = 0) AS inserted\n    "])), categoryId, record.itemName, record.defaultUom, record.quantity, record.typicalMidValue, record.marketGeography, record.source, record.asOfDate, record.projectTypeCode, record.usageCount, record.createdFromProjectId)];
                case 4:
                    upsertResult = _b.sent();
                    wasInserted = ((_a = upsertResult[0]) !== null && _a !== void 0 ? _a : { inserted: false }).inserted;
                    if (wasInserted) {
                        inserted += 1;
                    }
                    else {
                        updated += 1;
                    }
                    _b.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 3];
                case 6:
                    console.log("\u2705 Red Valley unit cost templates processed: ".concat(inserted, " inserted, ").concat(updated, " updated (total ").concat(records.length, ")."));
                    return [2 /*return*/];
            }
        });
    });
}
seedTemplates()
    .catch(function (error) {
    console.error('❌ Failed to seed Red Valley unit cost templates:', error);
    process.exit(1);
})
    .finally(function () {
    // neon serverless does not expose an explicit close; allow process to exit naturally.
});
var templateObject_1, templateObject_2;
