
export interface CutListItem {
  row: number;
  partName: string;
  length: number;
  width: number;
  count: number;
  pvc: string;
}

export interface DesignResult {
  imageUrl: string;
  technicalDescription: string;
  cutList: CutListItem[];
}

export enum AppStatus {
  IDLE = 'IDLE',
  LOADING_IMAGE = 'LOADING_IMAGE',
  LOADING_PLAN = 'LOADING_PLAN',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface CabinetSpecs {
  style: string;
  color: string;
  material: string;
  handleType: string;
  hasIsland: boolean;
  cabinetType: string;
  extraNotes: string;
}
