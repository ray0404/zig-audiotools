import { TrackState, RackModule } from '@sonic-core/types';

/**
 * Represents the purely persistent state of a project.
 * This schema separates the data we save to disk/cloud from the runtime application state.
 */
export interface PersistentProjectState {
  /** Schema version to handle future migrations (e.g., '1.0.0') */
  schemaVersion: string;

  /** Timestamp when the project was saved */
  timestamp: number;

  /** The list of tracks and their configurations */
  tracks: Record<string, PersistentTrackState>;

  /** The order of tracks in the mixer */
  trackOrder: string[];

  /** Master bus configuration */
  master: PersistentTrackState;
  
  /** 
   * Global project settings not tied to a specific track
   */
  meta: {
      tempo?: number;
      timeSignature?: [number, number];
  };
}

/**
 * Extended TrackState for persistence.
 * We explicitly add sourceAssetId to link the track to a file in the archive.
 */
export interface PersistentTrackState extends Omit<TrackState, 'rack'> {
  /** 
   * UUID pointing to a file in the /assets folder of the .sfg package.
   * This replaces the runtime assumption of looking in IDB.
   */
  sourceAssetId?: string;
  
  /**
   * The rack is persisted as-is, but we ensure the type definition is consistent.
   */
  rack: RackModule[];
}

/**
 * The manifest file (manifest.json) inside the .sfg package.
 * Contains metadata about the project and the package itself.
 */
export interface ProjectManifest {
  projectName: string;
  author?: string;
  created: number;     // Unix timestamp
  lastModified: number; // Unix timestamp
  appVersion: string;  // Version of Sonic Forge that saved this
  
  /**
   * Inventory of binary assets included in the package.
   * This allows for quick validation without parsing the whole zip.
   */
  assets: ProjectAssetEntry[];
}

export interface ProjectAssetEntry {
  id: string; // The UUID used in sourceAssetId or parameters
  path: string; // e.g., "assets/abc-123.wav"
  originalName: string;
  mimeType: string;
  size: number;
}
