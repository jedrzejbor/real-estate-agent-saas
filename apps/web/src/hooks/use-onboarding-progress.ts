'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/contexts/toast-context';
import { AnalyticsEventName, trackAnalyticsEvent } from '@/lib/analytics';
import type { AuthUser } from '@/lib/auth';
import type { DashboardStats } from '@/lib/dashboard';
import {
  createStoredDashboardOnboardingState,
  getCompletedDashboardOnboardingStepIds,
  getDashboardOnboardingChecklist,
  getDashboardOnboardingCoreSteps,
  getDashboardOnboardingStepLabel,
  sanitizeStoredDashboardOnboardingState,
  type DashboardOnboardingStep,
  type StoredDashboardOnboardingState,
} from '@/lib/onboarding';

const DASHBOARD_ONBOARDING_STORAGE_PREFIX = 'estateflow.dashboard-onboarding';

interface UseOnboardingProgressOptions {
  stats: DashboardStats;
  user: AuthUser | null;
}

export interface OnboardingProgressState {
  checklist: ReturnType<typeof getDashboardOnboardingChecklist>;
  coreSteps: DashboardOnboardingStep[];
  completedCoreSteps: number;
  totalCoreSteps: number;
  coreCompletionPercentage: number;
  activeStep: DashboardOnboardingStep | null;
  lastCompletedStep: DashboardOnboardingStep | null;
  isChecklistDismissed: boolean;
  isHydrated: boolean;
  shouldShowChecklist: boolean;
  isCoreOnboardingComplete: boolean;
  dismissChecklist: () => void;
  restoreChecklist: () => void;
}

export function useOnboardingProgress({
  stats,
  user,
}: UseOnboardingProgressOptions): OnboardingProgressState {
  const { success: showSuccessToast } = useToast();
  const checklist = useMemo(
    () => getDashboardOnboardingChecklist(stats),
    [stats],
  );
  const coreSteps = useMemo(
    () => getDashboardOnboardingCoreSteps(checklist),
    [checklist],
  );
  const completedStepIds = useMemo(
    () => getCompletedDashboardOnboardingStepIds(checklist),
    [checklist],
  );
  const completedStepIdsKey = completedStepIds.join(':');
  const storageKey = useMemo(
    () => getDashboardOnboardingStorageKey(user),
    [user],
  );
  const [storedState, setStoredState] =
    useState<StoredDashboardOnboardingState>(() =>
      createStoredDashboardOnboardingState(),
    );
  const [isHydrated, setIsHydrated] = useState(false);
  const completedCoreSteps = coreSteps.filter(
    (step) => step.state === 'completed',
  ).length;
  const totalCoreSteps = coreSteps.length;
  const coreCompletionPercentage =
    totalCoreSteps > 0
      ? Math.round((completedCoreSteps / totalCoreSteps) * 100)
      : 0;
  const isCoreOnboardingComplete =
    totalCoreSteps > 0 && completedCoreSteps === totalCoreSteps;

  const persistState = useCallback(
    (nextState: StoredDashboardOnboardingState) => {
      setStoredState(nextState);

      if (typeof window === 'undefined' || !storageKey) {
        return;
      }

      window.localStorage.setItem(storageKey, JSON.stringify(nextState));
    },
    [storageKey],
  );

  useEffect(() => {
    const now = new Date().toISOString();
    const initialCompletedStepId = completedStepIds.at(-1) ?? null;

    if (typeof window === 'undefined' || !storageKey) {
      setStoredState(
        createStoredDashboardOnboardingState({
          completedStepIds,
          lastCompletedStepId: initialCompletedStepId,
          updatedAt: completedStepIds.length > 0 ? now : null,
        }),
      );
      setIsHydrated(true);
      return;
    }

    const rawState = window.localStorage.getItem(storageKey);

    if (!rawState) {
      const nextState = createStoredDashboardOnboardingState({
        completedStepIds,
        lastCompletedStepId: initialCompletedStepId,
        updatedAt: completedStepIds.length > 0 ? now : null,
      });

      window.localStorage.setItem(storageKey, JSON.stringify(nextState));
      setStoredState(nextState);
      setIsHydrated(true);
      return;
    }

    try {
      const parsed = sanitizeStoredDashboardOnboardingState(
        JSON.parse(rawState),
      );
      const mergedCompletedStepIds = Array.from(
        new Set([...parsed.completedStepIds, ...completedStepIds]),
      );
      const nextState = createStoredDashboardOnboardingState({
        ...parsed,
        completedStepIds: mergedCompletedStepIds,
        lastCompletedStepId:
          parsed.lastCompletedStepId ?? mergedCompletedStepIds.at(-1) ?? null,
        updatedAt:
          parsed.updatedAt ?? (mergedCompletedStepIds.length > 0 ? now : null),
      });

      if (JSON.stringify(nextState) !== rawState) {
        window.localStorage.setItem(storageKey, JSON.stringify(nextState));
      }

      setStoredState(nextState);
    } catch {
      const fallbackState = createStoredDashboardOnboardingState({
        completedStepIds,
        lastCompletedStepId: initialCompletedStepId,
        updatedAt: completedStepIds.length > 0 ? now : null,
      });

      window.localStorage.setItem(storageKey, JSON.stringify(fallbackState));
      setStoredState(fallbackState);
    } finally {
      setIsHydrated(true);
    }
  }, [completedStepIds, completedStepIdsKey, storageKey]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const previouslyCompletedStepIds = new Set(storedState.completedStepIds);
    const newlyCompletedStepIds = completedStepIds.filter(
      (stepId) => !previouslyCompletedStepIds.has(stepId),
    );

    if (newlyCompletedStepIds.length === 0) {
      return;
    }

    const nextState = createStoredDashboardOnboardingState({
      ...storedState,
      dismissedAt: null,
      completedStepIds: Array.from(
        new Set([...storedState.completedStepIds, ...completedStepIds]),
      ),
      lastCompletedStepId:
        newlyCompletedStepIds.at(-1) ?? storedState.lastCompletedStepId,
      updatedAt: new Date().toISOString(),
    });

    persistState(nextState);

    const latestCompletedStepId = newlyCompletedStepIds.at(-1);
    if (latestCompletedStepId) {
      trackAnalyticsEvent({
        name: AnalyticsEventName.ONBOARDING_STEP_COMPLETED,
        properties: {
          stepId: latestCompletedStepId,
          completedCoreSteps,
          totalCoreSteps,
          coreCompletionPercentage,
        },
      });

      showSuccessToast({
        title: 'Checklista zaktualizowana',
        description: `Ukończono krok „${getDashboardOnboardingStepLabel(latestCompletedStepId)}”.`,
        duration: 4500,
      });
    }
  }, [
    completedStepIds,
    completedStepIdsKey,
    isHydrated,
    persistState,
    showSuccessToast,
    storedState,
    completedCoreSteps,
    coreCompletionPercentage,
    totalCoreSteps,
  ]);

  const dismissChecklist = useCallback(() => {
    persistState(
      createStoredDashboardOnboardingState({
        ...storedState,
        dismissedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    );
    trackAnalyticsEvent({
      name: AnalyticsEventName.ONBOARDING_CHECKLIST_DISMISSED,
      properties: {
        completedCoreSteps,
        totalCoreSteps,
        coreCompletionPercentage,
      },
    });
  }, [
    completedCoreSteps,
    coreCompletionPercentage,
    persistState,
    storedState,
    totalCoreSteps,
  ]);

  const restoreChecklist = useCallback(() => {
    persistState(
      createStoredDashboardOnboardingState({
        ...storedState,
        dismissedAt: null,
        updatedAt: new Date().toISOString(),
      }),
    );
    trackAnalyticsEvent({
      name: AnalyticsEventName.ONBOARDING_CHECKLIST_RESTORED,
      properties: {
        completedCoreSteps,
        totalCoreSteps,
        coreCompletionPercentage,
      },
    });
  }, [
    completedCoreSteps,
    coreCompletionPercentage,
    persistState,
    storedState,
    totalCoreSteps,
  ]);

  const activeStep = useMemo(
    () => checklist.steps.find((step) => step.state === 'ready') ?? null,
    [checklist],
  );
  const lastCompletedStep = useMemo(
    () =>
      storedState.lastCompletedStepId
        ? (checklist.steps.find(
            (step) => step.id === storedState.lastCompletedStepId,
          ) ?? null)
        : null,
    [checklist, storedState.lastCompletedStepId],
  );

  const isChecklistDismissed = Boolean(storedState.dismissedAt);

  return {
    checklist,
    coreSteps,
    completedCoreSteps,
    totalCoreSteps,
    coreCompletionPercentage,
    activeStep,
    lastCompletedStep,
    isChecklistDismissed,
    isHydrated,
    shouldShowChecklist: !isChecklistDismissed,
    isCoreOnboardingComplete,
    dismissChecklist,
    restoreChecklist,
  };
}

function getDashboardOnboardingStorageKey(
  user: AuthUser | null,
): string | null {
  const scopeId = user?.agency?.id ?? user?.id;

  if (!scopeId) {
    return null;
  }

  return `${DASHBOARD_ONBOARDING_STORAGE_PREFIX}.${scopeId}`;
}
