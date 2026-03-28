export interface Person {
  id: string;
  name: string;
  color: string;
  photo?: string;
}

export interface Event {
  id: string;
  title: string;
  timestamp: number;
  personIds: string[];
  color: string;
  location?: string;
  interpretation?: string;
  threadId?: string; // For event-based organization
}

export const EVENT_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

export const PERSON_COLORS = [
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#f43f5e', // rose
  '#a855f7', // purple
  '#eab308', // yellow
  '#22c55e', // green
  '#0ea5e9', // sky
  '#fb923c', // orange
];
