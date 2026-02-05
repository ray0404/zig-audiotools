import { useCallback } from 'react';
import { useAudioStore } from '@/store/useAudioStore';

export function useProjectPersistence() {
  const { saveProject: storeSave, loadProject: storeLoad } = useAudioStore();

  const saveProject = useCallback(async () => {
    await storeSave();
  }, [storeSave]);

  const loadProject = useCallback(async () => {
    await storeLoad();
  }, [storeLoad]);

  return {
    saveProject,
    loadProject,
    isPersistedToDisk: true // We can consider IDB "persisted" for this context
  };
}