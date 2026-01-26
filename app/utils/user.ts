export interface UserSettings {
  name: string;
  examDate?: string; // YYYY-MM-DD (Optional)
  targetScore?: string; // Optional
  // Display Preferences
  showDefinition?: boolean;
  showPhonetic?: boolean;
  // Progress
  lastStudiedWordId?: number;
}

const USER_STORAGE_KEY = 'rush_user_settings';

export function getUserSettings(): UserSettings | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(USER_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch (e) {
    return null;
  }
}

export function saveUserSettings(settings: UserSettings) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(settings));
}

export function hasUserSettings(): boolean {
  return !!getUserSettings();
}