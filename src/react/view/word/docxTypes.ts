export type DocxMode = 'viewer' | 'editor';

export type DocxSavePurpose = 'save' | 'backup';

export type HostSaveResult = { success: boolean; error?: string };

export type HostSaveWaiter = (result: HostSaveResult) => void;
