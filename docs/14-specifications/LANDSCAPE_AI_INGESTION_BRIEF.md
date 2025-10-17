**Landscape DMS AI Briefing Note: Ingestion Model Requirements**

**Objective**  
Develop a domain-specific document understanding model capable of extracting structured data from highly variable real estate offering memoranda (OMs) and related materials (rent rolls, appraisals, market reports). The model must parse, normalize, and validate property-level information regardless of document layout, formatting, or completeness.

---

### 1. Core Challenge: Layout & Representation Bias

**Problem:** Traditional LLMs and NLP models over-weight semantic density (narrative volume) and under-weight structural density (data-rich tables). This bias causes underperformance on compact, table-dominant OMs that appear sparse but encode high-value structured data.

**Requirement:** Build a multimodal, layout-aware model capable of attending to both textual semantics and geometric structure. The ingestion pipeline must recognize, extract, and interpret data regardless of presentation style—prose, tables, callout boxes, or embedded graphics.

---

### 2. Architecture Overview

**Multi-Stage Ingestion Pipeline**
1. **Document Classification** – Identify document type (OM, rent roll, appraisal, etc.) and property type (multifamily, retail, land, mixed-use). Confidence threshold: 0.85 to proceed.
2. **Section Detection** – Locate structural sections (Executive Summary, Financials, Rent Roll, Market Analysis). Apply positional embeddings and layout segmentation.
3. **Field Extraction** – Run specialized extractors for pricing metrics, unit mix, financials, comps, and parcel data. Handle multiple table formats.
4. **Inference & Gap Filling** – When fields are missing, infer values using context + domain priors. Flag all inferred data with confidence < 0.7.
5. **Validation & Confidence Scoring** – Cross-check internal logic (e.g., NOI < EGI, Units x Avg Rent ≈ GPR). Output JSON with confidence metadata per field.

---

### 3. Core Model Features

- **Layout-aware Transformer Backbone** (e.g., LayoutLMv3 / Donut / DocFormer)
- **Dual Representation Learning:** token-level (semantic) + cell-level (tabular)
- **Confidence-weighted Field Extraction:** each value tagged with probability and source method
- **Domain Knowledge Layer:** enforces real-estate-specific logic (e.g., cap rate formula, NOI sanity checks)
- **Active Learning Loop:** user corrections feed back into fine-tuning and improve model accuracy over time

---

### 4. Data Annotation Strategy

- Annotate 50–100 OMs per property type (multifamily, office, retail, land)
- Label:
  - Bounding boxes for key sections
  - Entity tags for fields (Price, Units, Cap Rate, APN, etc.)
  - Relationships (e.g., Unit 315 → Manager Unit)
- Assign **difficulty scores** (0–10) for extraction complexity
- Include **negative examples** (non-OM documents) for classifier tuning

---

### 5. Confidence Framework

| Confidence | Description | Example | Action |
|-------------|-------------|----------|---------|
| 0.9–1.0 | Extracted directly from labeled table cell | Cap Rate: 4.00% | Auto-populate |
| 0.7–0.89 | Keyword matched within structured section | Loan Term: 30 years | Populate + spot-check |
| 0.5–0.69 | Contextually inferred | APN missing, inferred from text | Flag for review |
| 0.3–0.49 | Heuristic or assumed | Other Income not itemized | Suggest + confirm |
| <0.3 | Unreliable / conflicting | OCR garble | Leave blank |

---

### 6. Success Metrics

- Extraction accuracy >85% across test corpus
- False-positive rate <5%
- Confidence-weighted user correction rate decline over time (>50% reduction within 6 months)
- Successful ingestion of 95% of valid fields from at least 80% of OMs

---

### 7. Strategic Goal

Build an AI engine that **thrives on unstandardized input**, not one that depends on clean formatting. The target outcome is a continuously learning ingestion model that transforms chaotic, inconsistent real-estate PDFs into structured, validated property intelligence with traceable confidence scores.