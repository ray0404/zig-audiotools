import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { get as getIDB } from 'idb-keyval';
import { PersistentProjectState, ProjectManifest, PersistentTrackState, ProjectAssetEntry } from '../types/project';
import { AudioState } from '../store/useAudioStore';
import { TrackState, RackModule } from '@sonic-core/types';

export class ProjectPackager {
  
  /**
   * Bundles the current project state and assets into a .sfg file.
   */
  static async exportProject(state: AudioState, projectName: string = 'My Project'): Promise<void> {
    const zip = new JSZip();
    const assetsFolder = zip.folder("assets");
    
    if (!assetsFolder) throw new Error("Failed to create assets folder in zip");

    // 1. Prepare Base Persistent State
    const persistentState: PersistentProjectState = {
      schemaVersion: '1.0.0',
      timestamp: Date.now(),
      tracks: {},
      trackOrder: state.trackOrder,
      master: this.convertToPersistentTrack(state.master),
      meta: {
          tempo: 120, // Default, as store doesn't have it yet
          timeSignature: [4, 4]
      }
    };

    // Convert tracks (initially without sourceAssetId)
    for (const [id, track] of Object.entries(state.tracks)) {
      persistentState.tracks[id] = this.convertToPersistentTrack(track as TrackState);
    }

    // 2. Gather Assets
    const assetEntries: ProjectAssetEntry[] = [];
    const usedAssetIds = new Set<string>();

    // --- A. Handle Track Source Files (Legacy IDB Pattern) ---
    for (const trackId of state.trackOrder) {
        const track = state.tracks[trackId];
        
        // If track has audio data associated
        if (track.sourceDuration > 0) {
            // Try to retrieve from the legacy IDB key
            const sourceBlob = await getIDB(`track_${trackId}_source`) as File;
            
            if (sourceBlob) {
                // Generate a new UUID for this asset in the package
                const assetId = crypto.randomUUID();
                
                // Link it in the persistent JSON
                persistentState.tracks[trackId].sourceAssetId = assetId;
                
                // Add to Zip
                const extension = sourceBlob.name.split('.').pop() || 'wav';
                const fileName = `${assetId}.${extension}`;
                assetsFolder.file(fileName, sourceBlob);
                
                assetEntries.push({
                    id: assetId,
                    path: `assets/${fileName}`,
                    originalName: sourceBlob.name,
                    mimeType: sourceBlob.type,
                    size: sourceBlob.size
                });
            }
        }
    }

    // --- B. Handle Rack Assets (IRs, etc.) ---
    const processAssetId = async (id: string) => {
        if (!id || usedAssetIds.has(id)) return;
        
        const blob = await getIDB(`asset_${id}`) as File | Blob;
        if (blob) {
             usedAssetIds.add(id);
             // Guess extension from type or default to .ir (which is likely wav)
             const ext = blob.type.includes('wav') ? 'wav' : 'bin';
             const fileName = `${id}.${ext}`;
             
             assetsFolder.file(fileName, blob);
             
             assetEntries.push({
                 id,
                 path: `assets/${fileName}`,
                 originalName: (blob as any).name || 'unknown_asset',
                 mimeType: blob.type,
                 size: blob.size
             });
        }
    };

    const scanRack = async (rack: RackModule[]) => {
        for (const module of rack) {
             for (const [key, value] of Object.entries(module.parameters)) {
                 if (key.endsWith('AssetId') && typeof value === 'string' && value) {
                     await processAssetId(value);
                 }
             }
        }
    };

    await scanRack(state.master.rack);
    for (const track of Object.values(state.tracks)) {
        await scanRack((track as TrackState).rack);
    }

    // 3. Create Manifest
    const manifest: ProjectManifest = {
        projectName,
        author: 'User',
        created: Date.now(),
        lastModified: Date.now(),
        appVersion: '0.1.0', // Should ideally come from env
        assets: assetEntries
    };

    // 4. Add Metadata Files
    zip.file("project.json", JSON.stringify(persistentState, null, 2));
    zip.file("manifest.json", JSON.stringify(manifest, null, 2));

    // 5. Generate and Download
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${projectName}.sfg`);
  }

  private static convertToPersistentTrack(track: TrackState): PersistentTrackState {
      // Create a shallow copy to avoid mutating the store
      const { ...rest } = track;
      
      return {
          ...rest,
          sourceAssetId: undefined, // Default to undefined, filled by export logic if found
          rack: track.rack
      };
  }
}
