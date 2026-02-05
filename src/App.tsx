import { useEffect } from 'react';
import { useAudioStore } from '@/store/useAudioStore';
import { MasteringWorkspace } from '@/components/layout/MasteringWorkspace';

function App() {
  const { isInitialized, initializeEngine } = useAudioStore();

  useEffect(() => {
    // Attempt auto-init on user interaction if needed
  }, []);

  const handleStart = async () => {
      await initializeEngine();
  };

  if (!isInitialized) {
      return (
          <div className="flex items-center justify-center h-full w-full bg-background">
              <button
                onClick={handleStart}
                className="px-8 py-4 bg-primary hover:bg-blue-600 text-white font-bold rounded-xl shadow-2xl transition-all transform hover:scale-105"
              >
                  Initialize Sonic Forge
              </button>
          </div>
      )
  }

  return <MasteringWorkspace />;
}

export default App;
