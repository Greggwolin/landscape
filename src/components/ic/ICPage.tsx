'use client';

import { useState, useCallback, useRef } from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CBadge,
} from '@coreui/react';
import { AggressivenessSlider } from './AggressivenessSlider';
import { ICResultsTabs, type ScenarioStep } from './ICResultsTabs';
import { PresentationModeView } from './PresentationModeView';
import { LandscaperChatThreaded, type LandscaperChatHandle } from '@/components/landscaper/LandscaperChatThreaded';

interface ICPageProps {
  projectId: number;
  projectName?: string;
}

export function ICPage({ projectId, projectName }: ICPageProps) {
  const [aggressiveness, setAggressiveness] = useState(5);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [challengeCount, setChallengeCount] = useState(0);
  const [presentedCount, setPresentedCount] = useState(0);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [scenarioSteps, setScenarioSteps] = useState<ScenarioStep[]>([]);
  const chatRef = useRef<LandscaperChatHandle>(null);

  const handleStartSession = useCallback(async () => {
    if (chatRef.current) {
      await chatRef.current.sendMessage(
        `Start an Investment Committee review with aggressiveness level ${aggressiveness}. ` +
        `Challenge my assumptions and show me where the model might be too aggressive or too conservative.`
      );
      setSessionActive(true);
    }
  }, [aggressiveness]);

  const handleEnterPresentationMode = useCallback(() => {
    setIsPresentationMode(true);
  }, []);

  const handleExitPresentationMode = useCallback(() => {
    setIsPresentationMode(false);
  }, []);

  // Presentation mode overlay
  if (isPresentationMode) {
    return (
      <PresentationModeView
        slides={scenarioSteps.map((s, i) => ({
          ...s,
          index: i,
        }))}
        onExit={handleExitPresentationMode}
      />
    );
  }

  return (
    <div className="d-flex flex-column h-100">
      {/* Page Header */}
      <div className="px-4 py-3 border-bottom d-flex align-items-center justify-content-between">
        <div>
          <h1 className="h4 mb-0">
            Investment Committee
            {projectName && (
              <span className="text-body-secondary fw-normal ms-2" style={{ fontSize: '0.9rem' }}>
                {'\u2014'} {projectName}
              </span>
            )}
          </h1>
        </div>
        <div className="d-flex align-items-center gap-3">
          <AggressivenessSlider
            value={aggressiveness}
            onChange={setAggressiveness}
          />
          {sessionActive && (
            <CBadge color="warning" shape="rounded-pill">
              Session Active
            </CBadge>
          )}
        </div>
      </div>

      {/* Main Content: Split Layout */}
      <div className="flex-grow-1 d-flex" style={{ minHeight: 0 }}>
        {/* Left Panel: Chat (60%) */}
        <div
          className="d-flex flex-column border-end"
          style={{ width: '60%', minHeight: 0 }}
        >
          {!sessionActive ? (
            /* Pre-session state */
            <div className="d-flex flex-column align-items-center justify-content-center h-100 p-4">
              <CCard style={{ maxWidth: 500, width: '100%' }}>
                <CCardHeader className="text-center fw-semibold">
                  Devil&apos;s Advocate Mode
                </CCardHeader>
                <CCardBody className="text-center">
                  <p className="text-body-secondary mb-3">
                    Landscaper will scan your assumptions against market benchmarks
                    and challenge the most aggressive ones. Adjust the slider to
                    control how aggressively assumptions are scrutinized.
                  </p>
                  <div className="mb-4">
                    <AggressivenessSlider
                      value={aggressiveness}
                      onChange={setAggressiveness}
                    />
                  </div>
                  <CButton
                    color="warning"
                    size="lg"
                    onClick={handleStartSession}
                  >
                    Start IC Review
                  </CButton>
                </CCardBody>
              </CCard>
            </div>
          ) : (
            /* Active chat session */
            <div className="flex-grow-1" style={{ minHeight: 0 }}>
              <LandscaperChatThreaded
                ref={chatRef}
                projectId={projectId}
                pageContext="investment_committee"
                contextPillLabel="IC Review"
                contextPillColor="warning"
              />
            </div>
          )}
        </div>

        {/* Right Panel: Results Tabs (40%) */}
        <div
          className="d-flex flex-column p-3"
          style={{ width: '40%', minHeight: 0, overflow: 'auto' }}
        >
          {/* Presentation Mode Button */}
          <div className="d-flex justify-content-end mb-3">
            <CButton
              color="dark"
              variant="outline"
              size="sm"
              disabled={scenarioSteps.length === 0}
              onClick={handleEnterPresentationMode}
            >
              Presentation Mode
              {scenarioSteps.length > 0 && (
                <CBadge color="dark" className="ms-2" shape="rounded-pill">
                  {scenarioSteps.length}
                </CBadge>
              )}
            </CButton>
          </div>

          {/* Results Tabs */}
          <ICResultsTabs
            projectId={projectId}
            scenarioSteps={scenarioSteps}
          />

          {/* Session Summary (when active) */}
          {sessionActive && (
            <CCard className="mt-3">
              <CCardBody>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <span className="text-body-secondary" style={{ fontSize: '0.8rem' }}>
                      IC Session
                    </span>
                    <div className="fw-medium">
                      {presentedCount} of {challengeCount} challenges presented
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <CButton
                      color="secondary"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSessionActive(false);
                        setSessionId(null);
                      }}
                    >
                      End Session
                    </CButton>
                  </div>
                </div>
              </CCardBody>
            </CCard>
          )}
        </div>
      </div>
    </div>
  );
}
