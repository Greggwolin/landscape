'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CCard, CCardHeader, CCardBody, CButton, CFormInput } from '@coreui/react';
import { Send, Upload } from 'lucide-react';
import { useProjectContext } from '@/app/components/ProjectProvider';

interface LandscaperPanelProps {
  onDataIngested: () => void;
}

interface Message {
  id: string;
  role: 'landscaper' | 'user';
  content: string;
  timestamp: Date;
  actions?: MessageAction[];
}

interface MessageAction {
  label: string;
  value?: string | number;
  field?: string;
}

// Keywords for scripted responses
const RESPONSE_TRIGGERS: Record<string, (submarket: string) => { content: string; actions?: MessageAction[] }> = {
  'absorption': (submarket) => ({
    content: `For projects this size in ${submarket}, typical absorption runs 150-200 units/year. I'd suggest 185 units/year as a baseline. Sound reasonable?`,
    actions: [
      { label: 'Accept 185/yr', value: 185, field: 'absorption' },
      { label: 'Adjust...' }
    ]
  }),
  'pricing': (submarket) => ({
    content: `Based on Redfin comps within 3 miles in ${submarket}, median new construction is running $445,000-$520,000 depending on lot size. Pricing looks healthy with good velocity.`
  }),
  'home price': (submarket) => ({
    content: `Based on Redfin comps within 3 miles in ${submarket}, median new construction is running $445,000-$520,000 depending on lot size. Pricing looks healthy with good velocity.`
  }),
  'flf': () => ({
    content: `Finished lot factors in this submarket typically range 20-25% depending on product size. For 45'-50' products I'd use 23%, for 55'-60' products consider 24%. Want me to apply these?`,
    actions: [
      { label: 'Apply FLF Defaults' },
      { label: 'Adjust...' }
    ]
  }),
  'lot ratio': () => ({
    content: `Finished lot factors in this submarket typically range 20-25% depending on product size. For 45'-50' products I'd use 23%, for 55'-60' products consider 24%. Want me to apply these?`,
    actions: [
      { label: 'Apply FLF Defaults' },
      { label: 'Adjust...' }
    ]
  }),
  'infrastructure': () => ({
    content: `For backbone infrastructure, I typically see $15,000-$25,000 per lot depending on terrain and utility connections. Offsite costs vary widely - traffic signals run $800K-$1.2M, arterial improvements depend on lineal footage. What's your rough estimate for total offsite?`
  }),
  'cost': () => ({
    content: `Infrastructure costs vary by phase. For a project this size, expect $15,000-$25,000/lot for in-tract improvements, plus offsite contributions. I've populated some benchmark values - feel free to adjust based on your knowledge of the site.`
  }),
  'timeline': () => ({
    content: `For an MPC of this scale (~1,100 units), typical timeline to first lot sale is 18-24 months (entitlements + first phase infrastructure). At 185 units/year absorption, you're looking at roughly 6 years to buildout. Does that align with your expectations?`,
    actions: [
      { label: 'Accept Timeline' },
      { label: 'Adjust...' }
    ]
  }),
  'help': () => ({
    content: `You can ask me about:\n• **Home prices** - Redfin comp analysis\n• **Lot values** - FLF ratios and residual calculations\n• **Absorption rates** - Market velocity\n• **Infrastructure costs** - Backbone and offsite\n• **Timeline** - Project duration assumptions\n\nOr upload a parcel table and I'll analyze your land plan!`
  })
};

const DEFAULT_RESPONSE = {
  content: `I'm still learning! For now, try asking about specific assumptions like pricing, absorption, or costs. You can also upload a parcel table and I'll help analyze it.`
};

export default function LandscaperPanel({ onDataIngested }: LandscaperPanelProps) {
  const { activeProject } = useProjectContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submarket = activeProject?.jurisdiction_city || 'this submarket';

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'landscaper',
          content: `I'm ready to help analyze this land deal. You can upload a parcel table, drop a pin on the map, or just tell me what you know about the project.`,
          timestamp: new Date()
        }
      ]);
    }
  }, [messages.length]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const generateResponse = (userMessage: string): { content: string; actions?: MessageAction[] } => {
    const lowerMessage = userMessage.toLowerCase();

    // Check each trigger keyword
    for (const [trigger, responseGen] of Object.entries(RESPONSE_TRIGGERS)) {
      if (lowerMessage.includes(trigger)) {
        return responseGen(submarket);
      }
    }

    return DEFAULT_RESPONSE;
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);

    // Simulate processing delay
    setTimeout(() => {
      const response = generateResponse(userMessage.content);
      const landscaperMessage: Message = {
        id: `landscaper-${Date.now()}`,
        role: 'landscaper',
        content: response.content,
        timestamp: new Date(),
        actions: response.actions
      };
      setMessages(prev => [...prev, landscaperMessage]);
      setIsProcessing(false);
    }, 800);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Add user message about upload
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: `[Uploaded: ${file.name}]`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    // Simulate processing
    setTimeout(() => {
      const processingMessage: Message = {
        id: `landscaper-${Date.now()}-1`,
        role: 'landscaper',
        content: `I'm processing ${file.name} now...`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, processingMessage]);
    }, 500);

    // Simulate completion after 2 seconds
    setTimeout(() => {
      const completionMessage: Message = {
        id: `landscaper-${Date.now()}-2`,
        role: 'landscaper',
        content: `I've processed ${file.name}. Here's what I found:\n\n• 47 SFD parcels across 3 phases\n• 3 MDR/attached parcels (207 units)\n• 2 commercial pads (20.5 acres)\n\nBased on ${submarket} submarket comps, I'm seeing strong pricing for 50' and 55' products. Want me to apply benchmark FLF ratios?`,
        timestamp: new Date(),
        actions: [
          { label: 'Apply Benchmarks' },
          { label: 'Review Details' }
        ]
      };
      setMessages(prev => [...prev, completionMessage]);
      setIsProcessing(false);
      onDataIngested(); // Trigger data population in parent
    }, 2500);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleActionClick = (action: MessageAction) => {
    // Show toast-style feedback (simplified for UI shell)
    const feedbackMessage: Message = {
      id: `landscaper-${Date.now()}`,
      role: 'landscaper',
      content: action.field
        ? `Applied ${action.value} to ${action.field}. The analysis panels have been updated.`
        : `Got it! I've applied the suggested values. You can adjust them in the panels on the left.`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, feedbackMessage]);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <CCard
      style={{
        backgroundColor: 'var(--cui-tertiary-bg)',
        border: '1px solid var(--cui-border-color)',
        height: 'calc(100vh - 300px)',
        minHeight: '500px',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <CCardHeader
        className="py-3"
        style={{ backgroundColor: 'var(--surface-card-header)' }}
      >
        <div className="d-flex align-items-center gap-2">
          <span style={{ fontSize: '1.2rem' }}>💬</span>
          <h6 className="mb-0 fw-bold" style={{ color: 'var(--cui-body-color)' }}>
            Landscaper
          </h6>
        </div>
      </CCardHeader>

      <CCardBody
        className="flex-grow-1 overflow-auto p-3"
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        {/* Messages */}
        <div className="flex-grow-1 overflow-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`mb-3 ${message.role === 'user' ? 'd-flex justify-content-end' : ''}`}
            >
              <div
                className="p-3 rounded"
                style={{
                  maxWidth: '90%',
                  backgroundColor: message.role === 'user'
                    ? 'var(--cui-primary)'
                    : 'var(--cui-body-bg)',
                  color: message.role === 'user'
                    ? '#fff'
                    : 'var(--cui-body-color)',
                  border: message.role === 'landscaper' ? '1px solid var(--cui-border-color)' : 'none'
                }}
              >
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="small fw-semibold">
                    {message.role === 'landscaper' ? 'Landscaper' : 'You'}
                  </span>
                  <span
                    className="small"
                    style={{
                      color: message.role === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--cui-secondary-color)'
                    }}
                  >
                    {formatTime(message.timestamp)}
                  </span>
                </div>
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {message.content}
                </div>
                {message.actions && message.actions.length > 0 && (
                  <div className="d-flex gap-2 mt-3">
                    {message.actions.map((action, idx) => (
                      <CButton
                        key={idx}
                        color="primary"
                        variant={idx === 0 ? 'solid' : 'outline'}
                        size="sm"
                        onClick={() => handleActionClick(action)}
                      >
                        {action.label}
                      </CButton>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="mb-3">
              <div
                className="p-3 rounded"
                style={{
                  backgroundColor: 'var(--cui-body-bg)',
                  border: '1px solid var(--cui-border-color)',
                  maxWidth: '90%'
                }}
              >
                <div className="d-flex align-items-center gap-2">
                  <div className="spinner-border spinner-border-sm text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <span className="small" style={{ color: 'var(--cui-secondary-color)' }}>
                    Landscaper is thinking...
                  </span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </CCardBody>

      {/* Input Area */}
      <div
        className="p-3"
        style={{
          borderTop: '1px solid var(--cui-border-color)',
          backgroundColor: 'var(--cui-body-bg)'
        }}
      >
        <div className="d-flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx,.xls,.csv"
            style={{ display: 'none' }}
          />
          <CButton
            color="secondary"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            title="Upload parcel table"
          >
            <Upload size={18} />
          </CButton>
          <CFormInput
            type="text"
            placeholder="Type a message or ask a question..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={isProcessing}
          />
          <CButton
            color="primary"
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isProcessing}
          >
            <Send size={18} />
          </CButton>
        </div>
      </div>
    </CCard>
  );
}
