'use client';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  helperText?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, label, helperText }) => {
  return (
    <div className="toggle-group">
      <div
        className={`toggle-switch ${checked ? 'active' : ''}`}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
      />
      <div>
        {label ? <div style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{label}</div> : null}
        {helperText ? <div className="helper-text">{helperText}</div> : null}
      </div>
    </div>
  );
};

export default ToggleSwitch;
