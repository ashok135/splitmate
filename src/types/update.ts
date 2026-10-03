export interface AppUpdateInfo {
  versionCode: number;
  versionName: string;
  downloadUrl: string;
  releaseNotes: string;
  forceUpdate?: boolean;
}
