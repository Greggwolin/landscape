'use client';

interface FloatingActionsProps {
  onPrevious?: () => void;
  onDelete?: () => void;
  onCancel?: () => void;
  onSave?: () => void;
  disabled?: boolean;
}

const FloatingActions: React.FC<FloatingActionsProps> = ({
  onPrevious,
  onDelete,
  onCancel,
  onSave,
  disabled
}) => {
  return (
    <div className="action-bar">
      <div style={{ display: 'flex', gap: 12 }}>
        <button type="button" className="btn btn-outline-secondary" onClick={onPrevious}>
          ◂ Previous Tenant
        </button>
        <button type="button" className="btn btn-danger" onClick={onDelete}>
          ⛔ Delete Lease
        </button>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" onClick={onSave} disabled={disabled}>
          💾 Save
        </button>
      </div>
    </div>
  );
};

export default FloatingActions;
