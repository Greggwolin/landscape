"""
Ingest Help Training Content for MF Appraisal Workflow.

Creates structured training chunks for the Help Landscaper's RAG retrieval,
covering the multifamily appraisal workflow pages an alpha tester will use.

Usage:
    python manage.py ingest_help_training_content
    python manage.py ingest_help_training_content --dry-run
    python manage.py ingest_help_training_content --clear-existing
"""

import json
import logging

from django.core.management.base import BaseCommand
from django.db import connection
from django.utils import timezone

from apps.knowledge.services.embedding_service import generate_embedding

logger = logging.getLogger(__name__)

DOCUMENT_KEY = "alpha-help-mf-training"
DOCUMENT_TITLE = "MF Appraisal Workflow Training Content"
KNOWLEDGE_DOMAIN = "alpha_help"
CHUNK_CATEGORY = "alpha_docs"

# Each chunk: (property_type, page_name, content_type, title, content)
# section_path will be: {property_type}/{page_name}/{content_type}/{title}
TRAINING_CHUNKS = [

    # ============================================================
    # HOME / PROJECT DASHBOARD
    # ============================================================

    ("BOTH", "home", "task_guide",
     "Project Dashboard Overview",
     """The Project Home page is your command center. At the top you see key performance indicators (KPIs) showing project-level metrics like total units, average rent, NOI, and cap rate. Below that is an activity feed showing recent changes to the project. Use the folder tabs across the top to navigate to different sections: Property, Operations, Valuation, Capital, Reports, Documents, and Map. The Landscaper AI panel on the right side can answer questions about your project data — ask it anything about the numbers you see."""),

    ("BOTH", "home", "task_guide",
     "How to navigate between pages",
     """Navigation uses folder tabs in the colored tile bar below the project selector. Click any tile to switch sections. Within each section, sub-tabs appear below the tiles. For example, clicking the Property tile shows sub-tabs for Details, Acquisition, Market, Rent Roll, and Renovation. The currently active tile is highlighted with a border. You can also use the Landscaper AI to ask 'take me to the rent roll' or 'where do I enter expenses' and it will tell you exactly where to go."""),

    # ============================================================
    # PROPERTY > DETAILS
    # ============================================================

    ("MF", "property_details", "task_guide",
     "Entering property details",
     """Go to Property > Details. This page captures the physical description of the property: name, address, year built, number of units, total square footage, lot size, zoning, and property class. The project mode (Napkin/Standard) controls how many fields are visible. In Napkin mode you see only the essentials — about 23 fields. Switch to Standard mode using the toggle in the sub-tab header to see the full professional field set including parking ratio, amenities, and structural details."""),

    ("BOTH", "property_details", "task_guide",
     "What are project modes",
     """Landscape has two project modes. Napkin mode shows only the essential fields needed for a quick analysis — about 23 fields total. Standard mode shows the full professional field set for detailed underwriting. You can switch between modes at any time without losing data — fields hidden in Napkin mode retain their values. The mode toggle appears in the sub-tab header area. This is unique to Landscape — ARGUS has no equivalent and always shows full complexity."""),

    # ============================================================
    # PROPERTY > RENT ROLL
    # ============================================================

    ("MF", "rent_roll", "task_guide",
     "How to enter rent roll data",
     """Go to Property > Rent Roll. The rent roll is a table where each row represents one unit. Columns include unit number, unit type (1BR, 2BR, etc.), square footage, market rent, contract rent, lease start/end dates, tenant name, and status (occupied, vacant, down). You can add units manually by clicking Add Unit, or you can upload a rent roll spreadsheet through the Documents section and let Landscaper extract the data automatically. Manually entered data and AI-extracted data both appear in the same table."""),

    ("MF", "rent_roll", "task_guide",
     "How to upload and extract a rent roll",
     """To extract a rent roll from a document: Go to Documents > All, then drag and drop your rent roll file (Excel or PDF). Landscaper will detect it as a rent roll document and offer to extract the data. The extraction stages the data for your review — you see each extracted value with a confidence score. Accept, edit, or reject each value before it commits to the rent roll. This is safer than blind import because you verify everything. If Landscaper misreads a value, correct it — the correction trains the system to be more accurate next time with similar documents."""),

    ("MF", "rent_roll", "data_flow",
     "Rent roll data flow",
     """Rent roll data automatically flows downstream to other pages. Rental income from the rent roll populates the revenue section of the Operations tab — you do not need to re-enter it. The Operations tab then calculates NOI, which feeds the Income Approach in the Valuation section. This means changing a rent on the rent roll automatically updates your NOI and your value estimate. In ARGUS Enterprise, you would need to manually link tenant data to the cash flow. In Excel, you would maintain formula references between worksheets. Landscape handles this automatically."""),

    ("MF", "rent_roll", "argus_crosswalk",
     "Rent roll vs ARGUS tenants module",
     """The Landscape Rent Roll is equivalent to the Tenants module in ARGUS Enterprise. In ARGUS, you enter each tenant with lease terms, rent steps, and renewal probabilities. In Landscape, the rent roll is simpler and more visual — a spreadsheet-style table focused on current state. Lease terms, escalations, and renewal assumptions are entered in the lease detail view (click any unit row to expand). One key difference: Landscape auto-populates operating revenue from the rent roll. In ARGUS, you must separately configure the revenue module to pull from tenant data."""),

    ("MF", "rent_roll", "excel_crosswalk",
     "Rent roll for Excel users",
     """If you are used to building rent rolls in Excel, the Landscape rent roll works similarly — it is a table with one row per unit. The difference is that Landscape handles the downstream calculations automatically. In Excel, you would SUM your rent column and reference that cell in your income statement worksheet. In Landscape, the Operations tab automatically pulls rental income from the rent roll. You also do not need to maintain your own formulas for vacancy, loss-to-lease, or concessions — Landscape calculates these from the rent roll data and your market assumptions."""),

    # ============================================================
    # OPERATIONS
    # ============================================================

    ("MF", "operations", "task_guide",
     "Operations tab overview",
     """Go to Operations. This is a unified P&L (profit and loss) view showing all revenue and expenses. Revenue comes automatically from the rent roll — you do not enter it here. Expenses are organized in a hierarchical tree: categories like Administrative, Maintenance, Utilities, Insurance, Taxes, and Management Fee, each with sub-line-items. You can enter expenses in total, per unit, per SF, or as a percentage of revenue. The right panel shows benchmark comparisons from IREM and other market sources so you can see how your assumptions compare to industry averages."""),

    ("MF", "operations", "task_guide",
     "How to enter operating expenses",
     """On the Operations page, expenses appear in a nested table. Click any category to expand its sub-items. To edit a value, click the cell and type. You can enter amounts as: total annual amount, per-unit amount, per-SF amount, or percentage of effective gross income. The other columns auto-calculate. For example, entering $500/unit for insurance automatically shows the total and per-SF equivalent. Use the benchmark panel on the right to compare your entries against market data. If your value is outside the typical range, Landscaper will flag it with a warning."""),

    ("MF", "operations", "task_guide",
     "How expense benchmarking works",
     """The benchmark panel on the Operations page shows market comparison data from IREM (Institute of Real Estate Management) and other sources. Each expense category shows your entered value alongside the benchmark range (low, median, high) for comparable properties. Values outside the typical range are highlighted. You can click any benchmark to see the source and methodology. Landscaper also validates your assumptions — if your total expense ratio is 80% of EGI when the market average is 45%, it will flag this as an outlier. Benchmarks are informational, not prescriptive — you can justify deviations."""),

    ("MF", "operations", "argus_crosswalk",
     "Operations vs ARGUS revenue and expense",
     """The Landscape Operations tab combines what ARGUS Enterprise splits into separate Revenue and Expense modules. In ARGUS, you configure revenue streams (base rent, percentage rent, reimbursements) and expense items separately, then the cash flow synthesizes them. In Landscape, the Operations tab shows the complete picture: rental revenue flows in from the rent roll automatically, and you enter expenses below. The unified view makes it easier to see your NOI at a glance. Expense categorization in Landscape follows a standard chart of accounts similar to IREM categories, which maps closely to ARGUS expense categories."""),

    ("MF", "operations", "data_flow",
     "How Operations connects to Valuation",
     """NOI calculated on the Operations page flows directly into the Income Approach in the Valuation section. You do not need to re-enter any revenue or expense data. The Income Approach page shows three NOI columns — Forward 12-Month Current (based on in-place rents), Forward 12-Month Market (based on market rents), and Stabilized NOI. All three pull from the Operations data with different revenue assumptions. If you change an expense on the Operations page, all three NOI columns and their corresponding value estimates update automatically."""),

    # ============================================================
    # VALUATION > SALES COMPARISON
    # ============================================================

    ("MF", "valuation_sales_comp", "task_guide",
     "How to add comparable sales",
     """Go to Valuation > Sales Comparison. Click Add Comparable to create a new comp entry. For each comparable sale, enter: property name, address, sale date, sale price, number of units, square footage, year built, cap rate, price per unit, and price per SF. After entering basic data, you can add adjustment categories (location, condition, size, age, amenities) with dollar or percentage adjustments. The adjusted value column shows the indicated value after all adjustments. At the bottom, a reconciliation section lets you weight the comps and arrive at an indicated value via the sales comparison approach."""),

    ("MF", "valuation_sales_comp", "task_guide",
     "How adjustments work in sales comparison",
     """Each comparable sale can have multiple adjustment line items. Click a comp row to expand the adjustment grid. Common adjustment categories include: location, condition, age/effective age, size, unit mix, amenities, and market conditions (time adjustment). Enter adjustments as dollar amounts or percentages. Positive adjustments mean the comp is inferior to the subject (adjusting upward). Negative adjustments mean the comp is superior (adjusting downward). The net adjustment and adjusted price per unit are calculated automatically. Keep net adjustments reasonable — typically under 25% total for reliable comps."""),

    ("MF", "valuation_sales_comp", "argus_crosswalk",
     "Sales comparison for ARGUS users",
     """ARGUS Enterprise does not have a built-in sales comparison approach — it focuses on income approach (DCF). If you use ARGUS, you likely maintain comparable sales in a separate Excel file or in your report narrative. Landscape integrates the sales comparison approach directly into the platform alongside the income and cost approaches, so all three approaches to value are in one place. The adjustment grid works like a standard paired-sales adjustment matrix you would build in Excel or your appraisal software."""),

    # ============================================================
    # VALUATION > INCOME APPROACH
    # ============================================================

    ("MF", "valuation_income", "task_guide",
     "Income approach overview",
     """Go to Valuation > Income Approach. This page supports both Direct Capitalization and Discounted Cash Flow (DCF) analysis. The page has three NOI basis columns: Forward 12-Month Current (F-12 Current based on in-place rents), Forward 12-Month Market (F-12 Market based on market rents), and Stabilized NOI. Each column shows revenue, expenses, and NOI. Below the NOI summary, the Direct Cap section lets you apply a cap rate to derive value. The DCF section lets you project cash flows over a holding period with a terminal cap rate for reversion value."""),

    ("MF", "valuation_income", "task_guide",
     "How to set cap rate and DCF assumptions",
     """Cap rate and DCF assumptions are set in the Assumptions panel on the right side of the Income Approach page. For Direct Cap: enter your going-in cap rate — the indicated value calculates automatically from NOI divided by cap rate. For DCF: set the holding period (typically 5-10 years), discount rate (IRR target), terminal cap rate, and growth assumptions for rent and expenses. The DCF calculates present value of projected cash flows plus reversion. You can toggle between the three NOI bases to see how value changes under each scenario."""),

    ("MF", "valuation_income", "data_flow",
     "How NOI flows from Operations to Income Approach",
     """The Income Approach pulls its NOI numbers directly from the Operations tab. You do not enter revenue or expenses on the Income Approach page — they flow automatically. If you change a rent on the Rent Roll, it updates Operations, which updates the Income Approach NOI, which updates the value estimate. This chain is automatic. The three NOI columns represent different scenarios: Current (what the property earns today with in-place rents), Market (what it would earn at market rents), and Stabilized (after lease-up or renovation). Each uses the same expense base but different revenue assumptions."""),

    ("MF", "valuation_income", "calculation_explanation",
     "How Direct Capitalization works in Landscape",
     """Direct Capitalization formula: Value = NOI / Cap Rate. In Landscape, NOI comes from the Operations tab. You enter the cap rate in the Assumptions panel. The calculation runs for each of the three NOI bases (Current, Market, Stabilized), so you see three indicated values. For example: if your Stabilized NOI is $500,000 and your cap rate is 5.5%, the indicated value is $500,000 / 0.055 = $9,090,909. The cap rate assumption is one of the most sensitive inputs — Landscaper will flag it if it falls outside the typical range for the market."""),

    ("MF", "valuation_income", "calculation_explanation",
     "How DCF works in Landscape",
     """The DCF (Discounted Cash Flow) projects annual cash flows over a holding period, then calculates the present value. Inputs: holding period (years), discount rate, rent growth rate, expense growth rate, terminal cap rate. Each year's NOI is projected by growing revenue and expenses at their respective rates. The terminal value (reversion) is calculated as the final year's NOI divided by the terminal cap rate, minus selling costs. All future cash flows (annual NOI + terminal value) are discounted back to present value at the discount rate. The sum is the DCF-indicated value. IRR is the discount rate that makes NPV equal to the purchase price."""),

    ("MF", "valuation_income", "argus_crosswalk",
     "Income approach vs ARGUS cash flow analysis",
     """The Landscape Income Approach combines what ARGUS Enterprise does across its Valuation and Cash Flow modules. In ARGUS, you build a detailed year-by-year cash flow with tenant-level lease modeling, then apply a terminal cap rate for reversion. Landscape simplifies this: NOI flows from Operations, and you set growth assumptions rather than modeling individual lease events. For most multifamily properties (where leases are short-term), this approach is practical and faster. The DCF section gives you the same NPV/IRR output as ARGUS but with less granular lease-by-lease modeling. For complex commercial leases, ARGUS has more lease-event detail."""),

    # ============================================================
    # VALUATION > COST APPROACH
    # ============================================================

    ("MF", "valuation_cost", "task_guide",
     "Cost approach overview",
     """Go to Valuation > Cost Approach. Enter three components: land value (typically from comparable land sales), replacement cost new (cost to rebuild the improvements), and depreciation (physical, functional, and external obsolescence). The indicated value by cost approach = Land Value + (Replacement Cost New - Total Depreciation). This approach is most relevant for newer properties where depreciation is minimal, or for special-purpose properties where income and sales data are limited. For typical apartment appraisals, this approach often receives less weight in reconciliation than income or sales comparison."""),

    ("MF", "valuation_cost", "task_guide",
     "How to enter depreciation",
     """The Cost Approach page has three depreciation sections: Physical Depreciation (wear and tear based on effective age and total economic life), Functional Obsolescence (design flaws, outdated features, or curable deficiencies), and External Obsolescence (environmental or economic factors outside the property). Enter each as a dollar amount or percentage of replacement cost new. Physical depreciation is typically the largest component. The depreciated value calculates automatically: Replacement Cost New minus total depreciation equals Depreciated Improvement Value. Add land value to get the indicated value by cost approach."""),

    # ============================================================
    # DOCUMENTS
    # ============================================================

    ("BOTH", "documents", "task_guide",
     "How to upload documents",
     """Go to Documents > All. Drag and drop files into the upload area, or click to browse. Supported formats: PDF, Excel (xlsx/xls), Word (docx), and images (jpg/png). After upload, Landscaper automatically classifies the document type (Offering Memorandum, Rent Roll, T-12, Appraisal, Market Study, etc.) and offers to extract structured data. You can also upload documents that are just for reference — not everything needs to be extracted. All documents are stored in the project DMS (Document Management System) and can be accessed by Project Landscaper for answering questions."""),

    ("BOTH", "documents", "task_guide",
     "How AI document extraction works",
     """When you upload a document, Landscaper reads it and identifies extractable data. For an Offering Memorandum, it finds property details, unit mix, financial summaries, and rent comps. For a rent roll spreadsheet, it maps columns to unit fields. For a T-12 (trailing 12-month operating statement), it extracts revenue and expense line items. Extracted data is staged for your review — nothing commits to the project automatically. You see each extracted value with a confidence score. Green means high confidence, yellow means verify, red means low confidence. Accept, edit, or reject each value. Corrections train the system to improve next time."""),

    ("BOTH", "documents", "task_guide",
     "What types of documents can Landscaper extract from",
     """Landscaper can extract structured data from: Offering Memoranda (OMs) — property details, financial summaries, rent comps, unit mix. Rent Rolls — unit-level data with rents, tenants, lease dates, status. T-12 Operating Statements — trailing 12-month revenue and expense line items. Appraisals — comparable sales, income analysis assumptions, value conclusions. Market Studies — market rents, vacancy rates, absorption data. The extraction quality depends on document format — clean PDFs and Excel files extract better than scanned images. For scanned documents, OCR runs first, which may introduce errors that you should verify carefully."""),

    # ============================================================
    # CAPITAL
    # ============================================================

    ("BOTH", "capital", "task_guide",
     "Capital structure overview",
     """Go to Capital > Equity or Capital > Debt. The Equity tab configures partner splits, preferred returns, and promote/waterfall structures. You can add multiple equity partners with different contribution amounts, preferred return rates, and promote tiers. The Debt tab configures loan terms: loan amount or LTV, interest rate, amortization period, term, and draw schedule. The waterfall calculations update automatically when you change partner terms. For appraisal purposes, the capital structure informs the discount rate selection and helps model leveraged returns."""),

    # ============================================================
    # REPORTS
    # ============================================================

    ("BOTH", "reports", "task_guide",
     "How to generate reports",
     """Go to Reports > Summary. The summary report compiles key project data, financial analysis, and valuation conclusions into a formatted view. Currently, export is available via browser print (Ctrl+P / Cmd+P) to save as PDF. A dedicated export feature with formatted PDF/Word output is on the roadmap. The report pulls data from all project sections — property details, rent roll summary, operating statement, valuation approaches, and capital structure. Changing data in any section automatically updates the report."""),

    # ============================================================
    # GENERAL / CROSS-CUTTING
    # ============================================================

    ("BOTH", "general", "task_guide",
     "How to use Project Landscaper AI",
     """The Landscaper AI panel appears on the right side of any project workspace page. Click the Landscaper AI tile or icon to open it. You can ask questions about your project data ('what is the average rent per unit?'), request actions ('update the cap rate to 5.5%'), upload documents for extraction ('extract the rent roll from this spreadsheet'), or ask for analysis ('how does my expense ratio compare to benchmarks?'). Landscaper has access to all your project data and documents. It can read and update fields across the project. This is different from Help (the panel you may be reading this in) — Help explains the app, Landscaper works with your data."""),

    ("BOTH", "general", "task_guide",
     "How to switch between projects",
     """Use the project selector dropdown in the Project Context Bar (the bar below the main navigation). Click the dropdown to see all your projects. Selecting a different project loads its data into the workspace. You can also go to the main Dashboard (click Dashboard in the top navigation) to see all projects as cards with key metrics. Click any project card to open it."""),

    ("BOTH", "general", "task_guide",
     "What is the difference between Help and Project Landscaper",
     """Help (this panel, accessed from the top navigation bar) explains how to use the Landscape application — where things are, how features work, how calculations are performed. It does not have access to any project data. Project Landscaper (the AI panel inside any project workspace) has full access to your project data and documents. It can read fields, update values, extract data from documents, and validate assumptions against benchmarks. Use Help to learn the app. Use Project Landscaper to work with your data."""),

    ("MF", "general", "excel_crosswalk",
     "Landscape for Excel users overview",
     """If you build underwriting models in Excel, Landscape replaces the typical multi-tab spreadsheet model. Each Landscape folder tab corresponds to what would be a worksheet in your Excel model: the Property tab replaces your property summary sheet, Operations replaces your operating statement sheet, and Valuation replaces your DCF/cap rate sheets. The key advantage: formulas are built in. You do not maintain cell references, copy formulas down rows, or worry about broken links between sheets. Enter your assumptions once and the calculations cascade automatically. Project modes let you start simple (Napkin = quick Excel sketch) and switch to Standard for the full field set later."""),

    ("MF", "general", "argus_crosswalk",
     "Landscape for ARGUS Enterprise users overview",
     """If you use ARGUS Enterprise for income property valuation, Landscape covers the same workflow with a more visual, unified interface. The Rent Roll replaces ARGUS Tenants module. Operations replaces the separate Revenue and Expense modules. Income Approach provides DCF and Direct Cap similar to ARGUS Cash Flow and Valuation. Key differences: Landscape auto-links rent roll to revenue (no manual configuration needed). Project modes (Napkin/Standard) let you work at different detail levels. Document extraction replaces manual data entry from offering memoranda. The three-approach valuation (Sales, Cost, Income) is integrated into one platform instead of requiring external tools for Sales Comparison and Cost Approach."""),

]


class Command(BaseCommand):
    help = 'Ingest Help training content for MF appraisal workflow'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Print chunks without ingesting',
        )
        parser.add_argument(
            '--clear-existing',
            action='store_true',
            help='Remove existing training document and chunks before ingesting',
        )

    def handle(self, *args, **options):
        if options['dry_run']:
            self.stdout.write(f"\nDRY RUN — {len(TRAINING_CHUNKS)} chunks to ingest:\n")
            for prop_type, page, ctype, title, content in TRAINING_CHUNKS:
                section_path = f"{prop_type}/{page}/{ctype}/{title}"
                self.stdout.write(f"  [{section_path}]")
                self.stdout.write(f"    {content[:100]}...\n")
            self.stdout.write(f"\nTotal: {len(TRAINING_CHUNKS)} chunks")
            return

        # Clear existing if requested
        if options['clear_existing']:
            with connection.cursor() as cursor:
                # Delete chunks first (FK constraint)
                cursor.execute("""
                    DELETE FROM landscape.tbl_platform_knowledge_chunks
                    WHERE document_id IN (
                        SELECT id FROM landscape.tbl_platform_knowledge
                        WHERE document_key = %s
                    )
                """, [DOCUMENT_KEY])
                deleted_chunks = cursor.rowcount
                # Delete document
                cursor.execute("""
                    DELETE FROM landscape.tbl_platform_knowledge
                    WHERE document_key = %s
                """, [DOCUMENT_KEY])
                deleted_docs = cursor.rowcount
                self.stdout.write(
                    f"Cleared {deleted_chunks} chunks and {deleted_docs} document(s) "
                    f"for key '{DOCUMENT_KEY}'"
                )

        # Create or get the parent document
        doc_id = self._get_or_create_document()
        self.stdout.write(f"Using document ID: {doc_id}")

        # Ingest chunks
        success = 0
        failed = 0

        for idx, (prop_type, page_name, content_type, title, content) in enumerate(TRAINING_CHUNKS):
            try:
                section_path = f"{prop_type}/{page_name}/{content_type}/{title}"
                full_text = f"{title}\n\n{content}"

                # Generate embedding
                embedding = generate_embedding(full_text)
                if not embedding:
                    self.stderr.write(f"  ! [{page_name}] {title}: embedding generation failed, skipping")
                    failed += 1
                    continue

                embedding_str = '[' + ','.join(str(x) for x in embedding) + ']'

                metadata = {
                    "page_name": page_name,
                    "content_type": content_type,
                    "property_type": prop_type,
                    "title": title,
                    "source": "help_training_mf_appraisal",
                    "last_updated": timezone.now().strftime("%Y-%m-%d"),
                }

                with connection.cursor() as cursor:
                    cursor.execute("""
                        INSERT INTO landscape.tbl_platform_knowledge_chunks
                        (document_id, chunk_index, content, content_type, section_path,
                         embedding, embedding_model, token_count, category, metadata, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s::vector, %s, %s, %s, %s, NOW())
                    """, [
                        doc_id,
                        idx,
                        full_text,
                        content_type,
                        section_path,
                        embedding_str,
                        'text-embedding-ada-002',
                        len(full_text.split()),  # rough token estimate
                        CHUNK_CATEGORY,
                        json.dumps(metadata),
                    ])

                success += 1
                self.stdout.write(f"  + [{section_path}]")

            except Exception as e:
                failed += 1
                self.stderr.write(f"  x [{page_name}] {title}: {e}")

        # Update document chunk count
        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE landscape.tbl_platform_knowledge
                SET chunk_count = %s,
                    ingestion_status = 'completed',
                    last_indexed_at = NOW(),
                    updated_at = NOW()
                WHERE id = %s
            """, [success, doc_id])

        self.stdout.write(f"\nIngestion complete: {success} succeeded, {failed} failed")

        # Verify
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*) FROM landscape.tbl_platform_knowledge_chunks
                WHERE document_id = %s
            """, [doc_id])
            total = cursor.fetchone()[0]
            self.stdout.write(f"Total chunks for this document: {total}")

            # Coverage report
            cursor.execute("""
                SELECT
                    metadata->>'page_name' as page,
                    metadata->>'content_type' as type,
                    COUNT(*) as chunks
                FROM landscape.tbl_platform_knowledge_chunks
                WHERE document_id = %s
                GROUP BY 1, 2
                ORDER BY 1, 2
            """, [doc_id])
            rows = cursor.fetchall()
            self.stdout.write("\nCoverage Report:")
            for page, ctype, count in rows:
                self.stdout.write(f"  {page:30s} {ctype:25s} {count}")

    def _get_or_create_document(self):
        """Get or create the parent platform knowledge document."""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id FROM landscape.tbl_platform_knowledge
                WHERE document_key = %s
            """, [DOCUMENT_KEY])
            row = cursor.fetchone()
            if row:
                return row[0]

            # Create new document
            cursor.execute("""
                INSERT INTO landscape.tbl_platform_knowledge
                (document_key, title, knowledge_domain, property_types,
                 description, ingestion_status, is_active,
                 metadata, created_at, updated_at, created_by)
                VALUES (%s, %s, %s, %s, %s, %s, TRUE, %s, NOW(), NOW(), %s)
                RETURNING id
            """, [
                DOCUMENT_KEY,
                DOCUMENT_TITLE,
                KNOWLEDGE_DOMAIN,
                json.dumps(["MF", "BOTH"]),
                "Training content for multifamily appraisal workflow — "
                "task guides, calculation explanations, ARGUS/Excel crosswalks, "
                "and data flow descriptions.",
                'ingesting',
                json.dumps({
                    "content_focus": "mf_appraisal_workflow",
                    "target_audience": "alpha_testers",
                    "created_by": "ingest_help_training_content",
                }),
                'system',
            ])
            doc_id = cursor.fetchone()[0]
            self.stdout.write(f"Created document '{DOCUMENT_KEY}' with id={doc_id}")
            return doc_id
