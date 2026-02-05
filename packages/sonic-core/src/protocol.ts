import { RackModuleType } from "./types";

export type EngineCommand =
  | { type: 'TRACK_ADD'; payload: { id: string; name: string } }
  | { type: 'TRACK_REMOVE'; payload: { id: string } }
  | { type: 'MODULE_ADD'; payload: { trackId: string; moduleId: string; type: RackModuleType } }
  | { type: 'MODULE_REMOVE'; payload: { trackId: string; moduleId: string } }
  | { type: 'PARAM_SET'; payload: { moduleId: string; param: string; value: number } }
  | { type: 'TRANSPORT_PLAY' }
  | { type: 'TRANSPORT_PAUSE' }
  | { type: 'TRANSPORT_SEEK'; payload: { time: number } };
