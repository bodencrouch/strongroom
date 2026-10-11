import type { StrongroomApi } from '@strongroom/shared/types';

declare global {
  interface Window {
    strongroom: StrongroomApi;
  }
}
