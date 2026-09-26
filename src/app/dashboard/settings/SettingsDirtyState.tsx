"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type SettingsDirtySection = {
  id: string;
  label: string;
  anchorId?: string;
};

type SettingsSectionActions = {
  save?: () => void | Promise<void>;
  discard?: () => void;
  isSaving?: boolean;
};

type SettingsDirtyStateContextValue = {
  dirtySections: SettingsDirtySection[];
  hasUnsavedChanges: boolean;
  isSavingAny: boolean;
  reportSection: (section: SettingsDirtySection, isDirty: boolean) => void;
  unregisterSection: (id: string) => void;
  registerActions: (id: string, actions: SettingsSectionActions) => void;
  unregisterActions: (id: string) => void;
  saveAllDirtySections: () => Promise<void>;
  discardAllDirtySections: () => void;
};

const SettingsDirtyStateContext = createContext<
  SettingsDirtyStateContextValue | undefined
>(undefined);

export function SettingsDirtyStateProvider({ children }: { children: ReactNode }) {
  const [sections, setSections] = useState<Record<string, SettingsDirtySection>>(
    {},
  );
  const [actions, setActions] = useState<Record<string, SettingsSectionActions>>(
    {},
  );

  const reportSection = useCallback(
    (section: SettingsDirtySection, isDirty: boolean) => {
      setSections((current) => {
        if (!isDirty) {
          if (!current[section.id]) {
            return current;
          }

          const next = { ...current };
          delete next[section.id];
          return next;
        }

        const existing = current[section.id];

        if (
          existing?.label === section.label &&
          existing?.anchorId === section.anchorId
        ) {
          return current;
        }

        return {
          ...current,
          [section.id]: section,
        };
      });
    },
    [],
  );

  const unregisterSection = useCallback((id: string) => {
    setSections((current) => {
      if (!current[id]) {
        return current;
      }

      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);

  const registerActions = useCallback(
    (id: string, nextActions: SettingsSectionActions) => {
      setActions((current) => ({
        ...current,
        [id]: nextActions,
      }));
    },
    [],
  );

  const unregisterActions = useCallback((id: string) => {
    setActions((current) => {
      if (!current[id]) {
        return current;
      }

      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);

  const dirtySections = useMemo(() => Object.values(sections), [sections]);

  const isSavingAny = useMemo(
    () => dirtySections.some((section) => actions[section.id]?.isSaving),
    [actions, dirtySections],
  );

  const saveAllDirtySections = useCallback(async () => {
    for (const section of Object.values(sections)) {
      const save = actions[section.id]?.save;

      if (save) {
        await save();
      }
    }
  }, [actions, sections]);

  const discardAllDirtySections = useCallback(() => {
    for (const section of Object.values(sections)) {
      actions[section.id]?.discard?.();
    }
  }, [actions, sections]);

  const value = useMemo(
    () => ({
      dirtySections,
      hasUnsavedChanges: dirtySections.length > 0,
      isSavingAny,
      reportSection,
      unregisterSection,
      registerActions,
      unregisterActions,
      saveAllDirtySections,
      discardAllDirtySections,
    }),
    [
      dirtySections,
      isSavingAny,
      reportSection,
      unregisterSection,
      registerActions,
      unregisterActions,
      saveAllDirtySections,
      discardAllDirtySections,
    ],
  );

  return (
    <SettingsDirtyStateContext.Provider value={value}>
      {children}
    </SettingsDirtyStateContext.Provider>
  );
}

export function useSettingsDirtyState() {
  const context = useContext(SettingsDirtyStateContext);

  if (!context) {
    throw new Error(
      "useSettingsDirtyState must be used within SettingsDirtyStateProvider.",
    );
  }

  return context;
}

export function useSettingsSectionDirty(
  section: SettingsDirtySection,
  isDirty: boolean,
) {
  const { reportSection, unregisterSection } = useSettingsDirtyState();
  const { id, label, anchorId } = section;

  useEffect(() => {
    reportSection({ id, label, anchorId }, isDirty);
  }, [anchorId, id, isDirty, label, reportSection]);

  useEffect(() => {
    return () => unregisterSection(id);
  }, [id, unregisterSection]);
}

export function useSettingsSectionActions(
  id: string,
  actions: SettingsSectionActions,
) {
  const { registerActions, unregisterActions } = useSettingsDirtyState();
  const saveRef = useRef(actions.save);
  const discardRef = useRef(actions.discard);

  saveRef.current = actions.save;
  discardRef.current = actions.discard;

  const save = useCallback(() => saveRef.current?.(), []);
  const discard = useCallback(() => discardRef.current?.(), []);

  useEffect(() => {
    registerActions(id, { save, discard, isSaving: actions.isSaving });
  }, [actions.isSaving, discard, id, registerActions, save]);

  useEffect(() => {
    return () => unregisterActions(id);
  }, [id, unregisterActions]);
}

export function settingsValuesEqual(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}
