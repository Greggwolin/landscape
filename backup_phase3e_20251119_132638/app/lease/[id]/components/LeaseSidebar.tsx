'use client';

interface LeaseTabItem {
  id: string;
  label: string;
}

interface LeaseTabsProps {
  activeTab: string;
  onTabChange: (id: string) => void;
}

const tabs: LeaseTabItem[] = [
  { id: 'general', label: 'General' },
  { id: 'rental', label: 'Rental Income' },
  { id: 'cpi', label: 'CPI' },
  { id: 'percentage', label: 'Percentage Rent' },
  { id: 'recoveries', label: 'Recoveries' },
  { id: 'misc', label: 'Miscellaneous' },
  { id: 'leasing', label: 'Leasing Costs' },
  { id: 'security', label: 'Security Deposits' },
  { id: 'market', label: 'Market Leasing' },
  { id: 'notes', label: 'Notes' }
];

const LeaseSidebar: React.FC<LeaseTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="lease-card">
      <div className="lease-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`lease-tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default LeaseSidebar;
