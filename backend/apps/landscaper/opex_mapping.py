# OpEx Account Mapping - Updated for migration 042 (Dec 2024)
# Maps extracted expense labels to core_unit_cost_category.category_id
# Reference: landscape.opex_account_migration_map for old→new ID mappings
OPEX_ACCOUNT_MAPPING = {
    # --- TAXES & INSURANCE (5100) ---
    'taxes': 53,                        # 5100 - Taxes & Insurance (parent)
    'taxes & insurance': 53,
    'property taxes': 65,               # 5110 - Property Taxes
    'real estate taxes': 78,            # 5111 - Real Estate Taxes
    'direct assessment': 79,            # 5112 - Direct Assessment Taxes
    'assessment taxes': 79,
    'other taxes & assessments': 79,
    'taxes & assessments': 79,
    'insurance': 66,                    # 5120 - Insurance
    'property insurance': 66,
    'liability insurance': 66,

    # --- UTILITIES (5200) ---
    'utilities': 54,                    # 5200 - Utilities (parent)
    'water': 67,                        # 5210 - Water/Sewer
    'water/sewer': 67,
    'water & sewer': 67,
    'water and sewer': 67,
    'water sewer': 67,
    'sewer': 67,
    'trash': 68,                        # 5220 - Trash
    'trash removal': 68,
    'garbage': 68,
    'refuse': 68,
    'rubbish': 68,
    'rubbish removal': 68,
    'electricity': 69,                  # 5230 - Electricity
    'electric': 69,
    'power': 69,
    'utilities (fuel, gas, electric)': 69,
    'gas': 70,                          # 5240 - Gas
    'natural gas': 70,
    'fuel': 70,

    # --- REPAIRS & MAINTENANCE (5300) ---
    'repairs': 100,                     # 5330 - Misc R&M (leaf)
    'repairs & maintenance': 100,
    'repairs and maintenance': 100,
    'r&m': 55,
    'maintenance': 55,
    'repairs & labor': 71,              # 5310 - Repairs & Labor
    'repair labor': 71,
    'maintenance contracts': 72,        # 5320 - Maintenance Contracts
    'contract services': 102,
    'contracted services': 102,
    'contracted services (pool service, pest control, landscaping)': 102,
    'janitorial': 80,                   # 5321 - Janitorial Services
    'janitorial services': 80,
    'cleaning': 80,
    'gardening': 81,                    # 5322 - Gardening
    'landscaping': 101,                 # 5331 - Landscaping & Grounds
    'grounds': 101,
    'grounds': 81,
    'pest control': 82,                 # 5323 - Pest Control
    'exterminator': 82,
    'elevator': 83,                     # 5324 - Elevator Maintenance
    'elevator maintenance': 83,
    'pool service': 102,
    'pool': 102,
    'pool maintenance': 102,
    'turnover': 71,                     # Unit turnover is R&M
    'make ready': 71,
    'unit turnover': 71,
    'apartment prep/turnover': 71,
    'apartment prep': 71,

    # --- ADMINISTRATIVE (5400) ---
    'administrative': 56,               # 5400 - Administrative (parent; now under Other Operating Expenses)
    'admin': 56,
    'g&a': 56,
    'management fee': 73,               # 5410 - Property Management (renamed)
    'management': 73,
    'property management': 73,
    'professional services': 74,        # 5420 - Professional Services
    'professional fees': 74,
    'legal': 74,
    'accounting': 74,
    'owner specific - cpa fees & legal expense': 74,
    'owner specific': 74,
    'cpa fees': 74,
    'legal expense': 74,
    'manager rent credit': 84,          # 5421 - Manager Rent Credit
    'telephone': 85,                    # 5422 - Telephone Expense
    'phone': 85,
    'communications': 85,
    'security': 86,                     # 5423 - Security/Fire/Alarm
    'alarm': 86,
    'fire alarm': 86,
    'business license': 87,             # 5424 - Business License/Tax
    'license': 87,
    'internet': 88,                     # 5425 - Internet Service
    'cable': 88,
    'miscellaneous': 68,                # map to Other/Trash category family for catch-all

    # --- MARKETING (5500) ---
    'marketing': 57,                    # 5500 - Marketing (parent)
    'advertising': 75,                  # 5510 - Advertising
    'leasing': 75,
    'promotion': 75,

    # --- PAYROLL & PERSONNEL (5550) - NEW ---
    'payroll': 89,                      # 5550 - Payroll & Personnel (parent; now under Other Operating Expenses)
    'personnel': 89,
    'salaries': 89,
    'wages': 89,
    'manager salary': 90,               # 5551 - On-Site Manager Salary
    'on-site manager': 90,
    'leasing staff': 92,                # 5553 - Leasing Staff
    'maintenance staff': 93,            # 5554 - Maintenance Staff
    'payroll taxes': 94,                # 5555 - Payroll Taxes
    'fica': 94,
    'employee benefits': 95,            # 5556 - Employee Benefits
    'benefits': 95,
    'health insurance': 95,

    # --- LAND DEVELOPMENT OPEX (5600-5900) ---
    'property taxes land': 49,          # 5600 - Property Taxes & Insurance (Land)
    'taxes unsold': 58,                 # 5610 - Property Taxes on Unsold Inventory
    'ad valorem': 76,                   # 5611 - Ad Valorem Taxes
    'special assessments': 77,          # 5612 - Special Assessments
    'insurance unsold': 59,             # 5620 - Insurance on Unsold Parcels
    'hoa': 50,                          # 5700 - HOA & Amenity Operations
    'hoa operations': 50,
    'amenity': 50,
    'hoa management': 60,               # 5710 - HOA Management
    'amenity operations': 61,           # 5720 - Amenity Operations
    'common area': 51,                  # 5800 - Common Area Maintenance
    'cam': 51,
    'landscape maintenance': 62,        # 5810 - Landscape Maintenance
    'infrastructure maintenance': 63,   # 5820 - Infrastructure Maintenance
    'sales marketing': 64,              # 5910 - Sales & Marketing

    # --- RESERVES (5990) - NEW ---
    'reserves': 96,                     # 5990 - Reserves (parent)
    'replacement reserves': 97,         # 5991 - Replacement Reserves
    'capex reserve': 98,                # 5992 - Capital Expenditure Reserve
    'capital reserve': 98,
    'capital reserves': 98,
}
