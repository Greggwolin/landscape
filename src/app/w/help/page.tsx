'use client';

import { RightContentPanel } from '@/components/wrapper/RightContentPanel';


export default function WrapperHelpPage() {
  return (
    <RightContentPanel title="Help">
      <div className="w-help-sections">
        <div className="w-help-section">
          <h3>Report a Bug</h3>
          <textarea
            placeholder="Describe the issue..."
            style={{
              width: '100%',
              minHeight: 80,
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px solid var(--w-border)',
              background: 'var(--w-bg-input)',
              color: 'var(--w-text-primary)',
              fontSize: 13,
              resize: 'vertical',
            }}
            readOnly
          />
          <button
            className="wrapper-btn wrapper-btn-primary"
            style={{ marginTop: 8 }}
            disabled
          >
            Submit
          </button>
        </div>

        <div className="w-help-section">
          <h3>Documentation</h3>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--w-text-secondary)', lineHeight: 2 }}>
            <li>Getting Started Guide</li>
            <li>Property Types &amp; Analysis</li>
            <li>Landscaper AI Tools Reference</li>
            <li>Keyboard Shortcuts</li>
          </ul>
        </div>

        <div className="w-help-section">
          <h3>Keyboard Shortcuts</h3>
          <table className="w-shortcuts-table">
            <tbody>
              <tr><td>Ctrl + K</td><td>Open search</td></tr>
              <tr><td>Ctrl + N</td><td>New chat thread</td></tr>
              <tr><td>Ctrl + B</td><td>Toggle sidebar</td></tr>
              <tr><td>Ctrl + /</td><td>Focus chat input</td></tr>
              <tr><td>Esc</td><td>Close panel / Cancel</td></tr>
              <tr><td>Ctrl + Enter</td><td>Send message</td></tr>
            </tbody>
          </table>
        </div>

        <div className="w-help-section">
          <h3>Send Feedback</h3>
          <p style={{ fontSize: 13, color: 'var(--w-text-secondary)', margin: 0 }}>
            Have suggestions or feedback? We'd love to hear from you.
          </p>
          <button
            className="wrapper-btn wrapper-btn-ghost"
            style={{ marginTop: 8 }}
            disabled
          >
            Send Feedback
          </button>
        </div>
      </div>
    </RightContentPanel>
  );
}
