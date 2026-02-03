'use client';

import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  analyzeDocument,
  cancelDocument,
  compileLandscaperInstructions,
  confirmDocument,
  DocumentAnalysis,
  LandscaperProfile,
  updateLandscaperProfile,
} from '@/services/landscaperProfile';
import DocumentUploadModal from './DocumentUploadModal';

interface ChatMessage {
  id: string;
  sender: 'user' | 'landscaper';
  text: string;
  created_at: string;
}

interface OnboardingChatProps {
  profile: LandscaperProfile;
  onProfileRefresh: () => Promise<void>;
}

const DOCUMENT_INVITATIONS: Record<string, string> = {
  appraiser: 'Bring sample appraisals or comp files.',
  land_developer: 'Upload your pro formas, feasibility models, or site plans.',
  cre_investor_multifamily: 'Share investment memos, rent rolls, or T12s.',
};

const getInitialMessage = (profile: LandscaperProfile) => {
  const parts = [];
  if (profile.role_primary) {
    const roleLabel = profile.role_primary.replace(/_/g, ' ');
    parts.push(`Hey! I see you are a ${roleLabel}.`);
  }
  if (profile.markets_text) {
    parts.push(`You're focused on ${profile.markets_text}.`);
  }
  if (profile.primary_tool) {
    parts.push(`You typically work in ${profile.primary_tool.toUpperCase()} workflows.`);
  }
  parts.push(`Tell me about anything you want me to learn before we dig in.`);
  return parts.join(' ');
};

const buildMessagesFromProfile = (profile: LandscaperProfile): ChatMessage[] => {
  if (profile.onboarding_chat_history && profile.onboarding_chat_history.length > 0) {
    return profile.onboarding_chat_history as ChatMessage[];
  }
  const initial = {
    id: 'initial',
    sender: 'landscaper' as const,
    text: getInitialMessage(profile),
    created_at: new Date().toISOString(),
  };
  return [initial];
};

export default function OnboardingChat({ profile, onProfileRefresh }: OnboardingChatProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(() => buildMessagesFromProfile(profile));
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [uploadState, setUploadState] = useState<'idle' | 'analyzing'>('idle');
  const [chatError, setChatError] = useState('');
  const [entering, setEntering] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [initialSeeded, setInitialSeeded] = useState(false);

  useEffect(() => {
    if (profile.onboarding_chat_history && profile.onboarding_chat_history.length > 0) {
      setMessages(profile.onboarding_chat_history as ChatMessage[]);
    }
  }, [profile.onboarding_chat_history]);

  useEffect(() => {
    if (initialSeeded) {
      return;
    }
    if (!profile.onboarding_chat_history || profile.onboarding_chat_history.length === 0) {
      const initialMessage = buildMessagesFromProfile(profile)[0];
      updateLandscaperProfile({ onboarding_chat_history: [initialMessage] })
        .catch(() => {})
        .finally(() => setInitialSeeded(true));
    } else {
      setInitialSeeded(true);
    }
  }, [initialSeeded, profile.onboarding_chat_history, profile]);

  const documentInvitation = useMemo(() => {
    const invitation = DOCUMENT_INVITATIONS[profile.role_primary] || 'Add any documents you want the Landscaper to read.';
    return invitation;
  }, [profile.role_primary]);

  const handleSendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!inputValue.trim()) return;
    const newMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random()}`,
      sender: 'user',
      text: inputValue.trim(),
      created_at: new Date().toISOString(),
    };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setIsSending(true);
    setChatError('');
    try {
      await updateLandscaperProfile({ onboarding_chat_history: updatedMessages });
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Unable to save chat message yet.');
    } finally {
      setIsSending(false);
    }
  };

  const handlePasteDocument = async (file: File) => {
    setUploadState('analyzing');
    setChatError('');
    try {
      const result = await analyzeDocument(file);
      setAnalysis(result);
      setModalOpen(true);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Document analysis failed.');
    } finally {
      setUploadState('idle');
    }
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handlePasteDocument(file);
    }
    event.target.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handlePasteDocument(file);
    }
  };

  const handleConfirmUpload = async () => {
    if (!analysis) return;
    setModalOpen(false);
    setUploadState('analyzing');
    try {
      await confirmDocument(analysis.document_id);
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-doc`,
          sender: 'landscaper',
          text: 'Got it. I saved that document to your Document Library and will use it to inform future answers.',
          created_at: new Date().toISOString(),
        },
      ]);
      await onProfileRefresh();
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Unable to confirm document.');
    } finally {
      setUploadState('idle');
      setAnalysis(null);
    }
  };

  const handleCancelUpload = async () => {
    if (!analysis) return;
    setModalOpen(false);
    try {
      await cancelDocument(analysis.document_id);
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-doc-cancel`,
          sender: 'landscaper',
          text: 'No problem—document discarded. Let me know if you want to try another upload.',
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Unable to cancel document.');
    } finally {
      setAnalysis(null);
    }
  };

  const handleEnterLandscape = async () => {
    if (entering) return;
    setEntering(true);
    try {
      await compileLandscaperInstructions();
      router.push('/dashboard');
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Unable to enter Landscape yet.');
    } finally {
      setEntering(false);
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--surface-card)', color: 'var(--text-primary)' }}>
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className="rounded-2xl p-4 shadow-sm max-w-[80%]"
                style={{
                  backgroundColor:
                    message.sender === 'user'
                      ? 'var(--cui-primary-bg-subtle)'
                      : 'var(--surface-card-header)',
                }}
              >
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  {message.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      {chatError && (
        <div className="mx-4 mb-2 rounded-lg border px-4 py-2 text-sm" style={{ borderColor: 'var(--track-change-deletion)', color: 'var(--track-change-deletion)' }}>
          {chatError}
        </div>
      )}
      <div className="mx-4 mb-6 space-y-4">
        <div
          className="rounded-2xl border border-dashed p-4 text-center transition"
          style={{
            borderColor: 'var(--cui-border-color)',
            backgroundColor: 'var(--surface-card)',
            color: 'var(--text-primary)',
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <p className="font-semibold mb-2">Upload a document</p>
          <p className="text-sm mb-3" style={{ color: 'var(--cui-secondary-color)' }}>
            {documentInvitation}
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-full border px-4 py-2 text-sm font-semibold"
            style={{ borderColor: 'var(--cui-primary)', color: 'var(--cui-primary)' }}
          >
            Choose a file{uploadState === 'analyzing' ? ' (analyzing...)' : ''}
          </button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
        </div>
        <form onSubmit={handleSendMessage} className="flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Send a message to your Landscaper"
            className="flex-1 rounded-3xl border px-4 py-3"
            style={{
              backgroundColor: 'var(--surface-card)',
              borderColor: 'var(--cui-border-color)',
              color: 'var(--text-primary)',
            }}
          />
          <button
            type="submit"
            disabled={isSending || !inputValue.trim()}
            className="rounded-full px-4 py-3 text-sm font-semibold transition"
            style={{
              backgroundColor: isSending ? 'var(--line-soft)' : 'var(--cui-primary)',
              color: 'var(--text-inverse)',
            }}
          >
            Send
          </button>
        </form>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleEnterLandscape}
            disabled={entering}
            className="rounded-full px-5 py-3 text-sm font-semibold"
            style={{
              color: 'var(--text-inverse)',
              background: entering
                ? 'var(--line-soft)'
                : 'linear-gradient(90deg, var(--cui-primary), var(--cui-secondary))',
            }}
          >
            {entering ? 'Preparing Landscape…' : 'Enter Landscape'}
          </button>
        </div>
      </div>
      <DocumentUploadModal
        open={modalOpen}
        analysis={analysis}
        onConfirm={handleConfirmUpload}
        onCancel={handleCancelUpload}
      />
    </div>
  );
}
