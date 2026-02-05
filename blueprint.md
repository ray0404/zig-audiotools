This blueprint outlines the remaining steps to transform **SonicForge** from a "Vite App" into a "Universal Audio Platform" containing a standalone core library, a UI component library, and separate Web/CLI applications. Phase 1 *should* be complete. Verify completion of phase 1, then proceed to complete the following remaining phases, effectiveley completing the SonicForge Universal refactor.

### **Phase 1: Type & Logic Extraction (The Foundation)**

Currently, your `types` are locked inside the Store, and the `Engine` is a singleton. Both prevent modular usage.

#### **1.1. Create a Shared Types Domain**

Move data shapes out of `src/store/useAudioStore.ts`. The Engine needs to know what a "RackModule" is without referencing the UI Store.

* **Action:** Create `src/audio/types.ts`.
* **Move:** `RackModuleType`, `RackModule`, `TrackState` definitions here.
* **Update:** Update `node-factory.ts` and `useAudioStore.ts` to import from `src/audio/types.ts`.

#### **1.2. Kill the Singleton**

Currently, `src/audio/mixer.ts` exports a single instance: `export const mixerEngine = new MixerEngine()`. This makes testing and running multiple instances (e.g., for offline rendering parallelization) impossible.

* **Action:** Export the **Class** only.
* **Refactor `useAudioStore.ts`:** Instantiate the engine inside the store creation or outside as a dependency.
```typescript
// src/audio/mixer.ts
export class MixerEngine { ... } // No 'export const mixerEngine = ...'

// src/store/useAudioStore.ts
const engine = new MixerEngine(); // Instantiate here for the Web App

```



### **Phase 2: Environment Abstraction (The Build Barrier)**

Your `ContextManager.ts` uses `import ... from '...?worker&url'`. This is **Vite-proprietary syntax**. It will crash if you try to run this code in a standard Node.js context or a different bundler.

#### **2.1. The Worklet Provider Pattern**

You need to inject the *locations* of the worklet files, rather than hardcoding imports.

* **Define Interface:**
```typescript
// src/audio/core/types.ts
export interface WorkletProvider {
    getModuleUrls(): string[]; // Returns list of absolute URLs to .js worklets
}

```


* **Refactor `ContextManager`:**
```typescript
export class ContextManager {
    static async init(provider: WorkletProvider) {
        // ...
        const urls = provider.getModuleUrls();
        await Promise.all(urls.map(url => this.context.audioWorklet.addModule(url)));
    }
}

```


* **Implement Strategy:**
* **Web/Vite:** Create `ViteWorkletProvider` that uses the current `import ... ?url` syntax.
* **CLI/Node:** Create `FileSystemWorkletProvider` that resolves paths to `./dist/worklets` on the disk.



### **Phase 3: The "Headless" Protocol (Universal Control)**

To control the engine from a CLI, a WebSocket, or a Worker, you need a serialized command protocol. Methods like `mixerEngine.addTrack()` are JavaScript calls; you need **Messages**.

#### **3.1. Define the Protocol**

Create a schema for every action the engine can take.

```typescript
// src/audio/protocol.ts
export type EngineCommand =
  | { type: 'TRACK_ADD'; payload: { id: string; name: string } }
  | { type: 'MODULE_ADD'; payload: { trackId: string; moduleId: string; type: RackModuleType } }
  | { type: 'PARAM_SET'; payload: { moduleId: string; param: string; value: number } };

```

#### **3.2. The Command Dispatcher**

Add a method to your `MixerEngine` to handle these raw objects. This allows the CLI to send JSON commands over Puppeteer without calling specific functions manually.

```typescript
// src/audio/mixer.ts
handleCommand(command: EngineCommand) {
    switch(command.type) {
        case 'TRACK_ADD': this.addTrack(command.payload.id); break;
        // ...
    }
}

```

### **Phase 4: UI Decoupling (The Component Library)**

Your components currently read directly from the Store `RackModule` object. To make them reusable (e.g., for a VST-like plugin web view or a different app), they should be "Dumb".

#### **4.1. Split "Connected" vs. "Pure"**

* **Current:** `CompressorUnit` takes a `RackModule` and calls `onUpdate('threshold', v)`.
* **Refactor:**
* **`PureCompressor`:** Accepts `threshold: number`, `ratio: number`, `onThresholdChange: (v) => void`. It has **no** idea what a `RackModule` is.
* **`ConnectedCompressor`:** Wraps `PureCompressor`. It subscribes to the Store, extracts values, and handles the updates.



This allows you to re-use `PureCompressor` in a different project where the state management might be Redux, React Context, or simple React State.

### **Phase 5: Directory Restructure (The Final Form)**

Organize the codebase to enforce these boundaries physically.

```text
/packages
  /sonic-core           (The Engine, NodeFactory, Types, Protocol)
     - No React. No Zustand. No Vite-specific syntax (unless injected).
  
  /sonic-ui             (The React Component Library)
     - Pure components (Knobs, PureCompressor).
     - Tailwind styles.
  
  /sonic-web-glue       (The Zustand Stores & Context Providers)
     - Connects Core to UI. Implements ViteWorkletProvider.

/apps
  /web-daw              (Your current Main App)
     - Imports from packages.
  
  /cli-tool             (Your CLI)
     - Imports protocol types from sonic-core.
     - Implements FileSystemWorkletProvider.

```
