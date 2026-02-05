import JSZip from 'jszip';
import { set as setIDB } from 'idb-keyval';
import { PersistentProjectState } from '../types/project';
import { useAudioStore } from '../store/useAudioStore';

export class ProjectLoader {
  
  /**
   * Imports a .sfg file, extracting assets to IDB and restoring state.
   */
  static async importProject(file: File): Promise<void> {
    const zip = await JSZip.loadAsync(file);
    
    // 1. Read Project State
    const projectJson = await zip.file("project.json")?.async("string");
    if (!projectJson) throw new Error("Invalid .sfg file: missing project.json");
    
    const state: PersistentProjectState = JSON.parse(projectJson);
    
    // 2. Restore Assets to IDB
    const assetsFolder = zip.folder("assets");
    if (assetsFolder) {
        const promises: Promise<void>[] = [];

        // A. Track Sources (Map back to legacy IDB keys for engine)
        for (const [trackId, track] of Object.entries(state.tracks)) {
            if (track.sourceAssetId) {
                const assetFile = this.findFileInZip(assetsFolder, track.sourceAssetId);
                
                if (assetFile) {
                    promises.push((async () => {
                        const blob = await assetFile.async("blob");
                        // Restore legacy IDB key for engine compatibility
                        // We construct a File object to mimic the original upload
                        const file = new File([blob], track.sourceName || "audio.wav", { type: blob.type });
                        await setIDB(`track_${trackId}_source`, file);
                    })());
                }
            }
        }

        // B. Generic Assets (IRs, etc.) - Restore everything to asset_{uuid}
        // This includes track sources if they are in the folder, which is fine (redundancy but safe)
        assetsFolder.forEach((relativePath, zipEntry) => {
            if (zipEntry.dir) return;
            const fileName = relativePath.split('/').pop()!;
            const id = fileName.split('.')[0];
            
            // Basic UUID check (length > 20) to avoid processing garbage
            if (id.length > 20) {
                 promises.push((async () => {
                     const blob = await zipEntry.async("blob");
                     await setIDB(`asset_${id}`, blob);
                 })());
            }
        });

        await Promise.all(promises);
    }
    
    // 3. Update IDB with Project Meta
    const meta = {
        updatedAt: Date.now(),
        tracks: state.tracks,
        trackOrder: state.trackOrder,
        master: state.master
    };
    await setIDB('current_project_meta', meta);
    
    // 4. Reset and Reload Engine
    const store = useAudioStore.getState();
    
    // Clear current tracks (copy array to avoid modification during iteration)
    const currentTracks = [...store.trackOrder];
    for (const id of currentTracks) {
        store.removeTrack(id);
    }
    
    // Trigger load which reads from the 'current_project_meta' we just wrote
    await store.loadProject();
  }
  
  private static findFileInZip(folder: JSZip, id: string): JSZip.JSZipObject | undefined {
      // Try common extensions
      const extensions = ['wav', 'mp3', 'ogg', 'bin'];
      for (const ext of extensions) {
          const file = folder.file(`${id}.${ext}`);
          if (file) return file;
      }
      
      // Fallback: search by prefix
      const matches = folder.filter((path) => path.includes(id));
      return matches.length > 0 ? matches[0] : undefined;
  }
}
