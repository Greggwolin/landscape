# Getting Started with Landscape

This guide covers everything from your first deal analysis to a saved project. There are two ways to get started — pick whichever fits your situation.

---

## Two Ways to Start

### Path A: Talk to Landscaper (Recommended)

Describe your deal in plain English. Landscaper figures out the rest.

Open Landscaper from the top navigation and tell it what you're looking at. You can be as brief or detailed as you want:

**Brief:**
> "I'm looking at a 96-unit apartment deal in Tempe."

**Detailed:**
> "Let's start a new apartment underwriting. Located at 8700 E. Camelback Road in Scottsdale, AZ. 100 units averaging 1,050sf. Average rent $1,500/month. Assume 5% vacancy. Going in cap of 5% with 60% debt at SOFR+3%, 7 year term, 20yr am. GP puts in 10% of equity, 8% pref, 20/80 promote to a 12% hurdle, then 50/50."

Landscaper will parse what you gave it, ask targeted questions about what's missing, and build toward a value conclusion — all within the conversation. You don't need to fill out any forms, pick any dropdowns, or know how Landscape organizes projects internally.

Once Landscaper has enough to produce numbers, it presents a summary with key metrics (NOI, value, returns, DSCR). At that point you can keep refining in conversation, or save it as a full project to work with in the detailed workspace.

**What Landscaper asks depends on what you provide.** If you gave it debt terms, it won't ask again. If you said "market-level expenses," it'll propose specific numbers and ask you to confirm. If you mentioned a waterfall structure, it'll ask about GP fees and disposition costs — the things you probably have an opinion on but didn't volunteer.

**What Landscaper won't ask:**
- Anything you already told it
- Anything it can look up (current SOFR rate, property tax rates)
- What property type it is when you said "apartment"

### Path B: Create a Project Manually

Click **New Project** from the Dashboard. Landscape asks three questions that shape your workspace, then drops you into the project tabs to enter data directly.

This path is faster if you already know exactly what you're building and want to get straight to the input forms. It's also the path to use when you're starting from a document upload (offering memorandum, rent roll, T-12) rather than a blank slate.

---

## The Three Questions (Both Paths)

Whether Landscaper infers them from your description or you pick them from a form, every project is defined by three choices. Landscaper handles these silently — if you use Path B, you'll see them as selections in the creation modal.

### What is it? → Property Type

The physical real estate you're analyzing.

| Choice | Use When |
|---|---|
| **Land** | Undeveloped land, subdivisions, master-planned communities |
| **Multifamily** | Apartments, student housing, senior living |
| **Office** | Office buildings, medical office, flex/R&D |
| **Retail** | Shopping centers, strip malls, single-tenant retail |
| **Industrial** | Warehouse, distribution, manufacturing, self-storage |

Property Type determines your data fields, container labels (Areas/Phases/Parcels vs. Buildings/Units), and which extraction templates Landscaper uses when you upload documents.

### How are you looking at it? → Analysis Perspective

The financial framework for your analysis.

**Investment** — You're evaluating income-producing real estate: buying, holding, operating, and eventually selling. The financial model centers on NOI, cap rates, debt service, and hold-period returns.

**Development** — You're building something: entitled land, vertical construction, or ground-up development. The financial model centers on development costs, absorption schedules, construction financing, and development profit margin.

Pick the one that matches how money flows through the deal. A multifamily acquisition is Investment. A multifamily ground-up build is Development. A land subdivision is Development. A portfolio of net-lease buildings is Investment.

### Why are you analyzing it? → Analysis Purpose

What question you're trying to answer.

**Valuation** — "What is this worth?" You're forming a market value opinion. The workspace emphasizes the three approaches to value (sales comparison, income, cost), reconciliation, and USPAP-aligned reporting. Debt and equity assumptions aren't required — market value is independent of how the buyer finances the deal. Typical users: appraisers, lenders, assessment reviewers, disposition advisors.

**Underwriting** — "Should we do this deal?" You're making an investment or development decision. The workspace emphasizes returns analysis (IRR, equity multiple, cash-on-cash), capital structure (debt sizing, equity waterfall), and sensitivity testing. Typical users: acquisitions analysts, developers, lenders, equity partners.

---

## What Shows Up Where

Your choices control which workspace tabs appear:

| | Investment + Valuation | Investment + Underwriting | Development + Valuation | Development + Underwriting |
|---|---|---|---|---|
| **Project Home** | ✓ | ✓ | ✓ | ✓ |
| **Property** | ✓ | ✓ | ✓ | ✓ |
| **Valuation** | ✓ | ✓ | ✓ | ✓ |
| **Capitalization** | — | ✓ | — | ✓ |
| **Returns** | — | ✓ | — | ✓ |
| **Dev Budget** | — | — | ✓ | ✓ |
| **Documents** | ✓ | ✓ | ✓ | ✓ |
| **Landscaper AI** | ✓ | ✓ | ✓ | ✓ |

Valuation purpose gives you a focused workspace. Underwriting adds the financial structuring tools. Development perspective adds the budget.

---

## Optional: Value-Add Toggle

If you chose **Investment** perspective (or Landscaper inferred it), you'll see a "Value-Add Analysis" option. Turn this on if the deal involves renovation or repositioning — it adds a Renovation sub-tab under Property where you can model CapEx, unit upgrades, and post-renovation rent projections. You can turn it on or off at any time without losing data.

---

## Working with Your Project

Once a project exists (either saved from a Landscaper conversation or created via the form), you land in the project workspace. From here you have three ways to add data:

**Upload documents.** Drop an offering memorandum, rent roll, T-12, or appraisal into the Documents tab. Landscaper extracts structured data automatically — unit mix, rents, expenses, comparable sales — and stages it for your review before committing to the project.

**Talk to Landscaper.** Open the Landscaper panel from any tab and ask questions, provide assumptions, or request analysis. "Set vacancy to 7%." "What's the DSCR at these debt terms?" "Run a sensitivity on exit cap rate from 5% to 6%." Landscaper updates the project data directly.

**Enter data manually.** Click into any tab and edit fields directly. The Property tab has your physical description and rent roll. The Valuation tab has comparable sales and approaches to value. Capitalization has your debt and equity structure. Everything auto-saves.

All three methods feed the same underlying project data — mix and match however you work best.

---

## Nothing is Permanent

Your Perspective and Purpose choices can be changed anytime in the project profile. Landscape adjusts the visible tabs instantly. No data is lost when you switch — the data stays in the database, the tabs just show or hide.

Switching from Underwriting to Valuation hides the Capitalization and Returns tabs but doesn't delete your debt and equity assumptions. Switch back and they're still there.
