'use client';

/**
 * LandscapeCommandSubscriber — bridges the chat-panel command bus to the
 * project-scoped UI surfaces it needs to drive.
 *
 * Mounted inside the ModalRegistryProvider's tree (currently in
 * /w/projects/[projectId]/layout.tsx). The chat panel lives ABOVE the
 * provider in the React tree, so it can't reach the modal registry via
 * context. This component listens on the command bus for commands the
 * chat panel emits, and dispatches them to the project-scoped surface.
 *
 * Adding a new command:
 * 1. Add the command type to LandscapeCommandPayloadMap in
 *    src/lib/landscape-command-bus.ts.
 * 2. Add a useLandscapeCommand handler here that resolves the command
 *    against whatever context / hook is in scope.
 *
 * This component renders nothing — it's just a subscriber.
 */

import { useCallback } from 'react';
import { useLandscapeCommand } from '@/lib/landscape-command-bus';
import { useModalRegistrySafe } from '@/contexts/ModalRegistryContext';

export function LandscapeCommandSubscriber() {
  const modalRegistry = useModalRegistrySafe();

  const handleOpenModal = useCallback(
    (payload: { modal_name: string; context?: Record<string, unknown> }) => {
      if (!modalRegistry) {
        // Defensive: should not happen because this component is mounted
        // inside the provider. If it does, log so we can find the
        // misconfiguration rather than silently dropping the command.
        console.warn(
          '[LandscapeCommandSubscriber] open_modal received but modalRegistry is null; '
          + 'subscriber is mounted outside ModalRegistryProvider.',
          payload,
        );
        return;
      }
      modalRegistry.openModal(payload.modal_name, payload.context);
    },
    [modalRegistry],
  );

  useLandscapeCommand('open_modal', handleOpenModal);

  return null;
}
