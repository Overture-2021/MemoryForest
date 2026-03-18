import { Event, Person } from './types/thread-memories';

const STORAGE_KEY = 'memory-forest.thread-memories';
const STORAGE_VERSION = 1;

export interface ThreadMemoriesSnapshot {
  version: number;
  people: Person[];
  events: Event[];
}

function isPerson(value: unknown): value is Person {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const person = value as Partial<Person>;
  return (
    typeof person.id === 'string' &&
    typeof person.name === 'string' &&
    typeof person.color === 'string'
  );
}

function isEvent(value: unknown): value is Event {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const event = value as Partial<Event>;
  return (
    typeof event.id === 'string' &&
    typeof event.title === 'string' &&
    typeof event.timestamp === 'number' &&
    Array.isArray(event.personIds) &&
    event.personIds.every((personId) => typeof personId === 'string') &&
    typeof event.color === 'string' &&
    (event.interpretation === undefined || typeof event.interpretation === 'string') &&
    (event.threadId === undefined || typeof event.threadId === 'string')
  );
}

function isSnapshot(value: unknown): value is ThreadMemoriesSnapshot {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const snapshot = value as Partial<ThreadMemoriesSnapshot>;
  return (
    typeof snapshot.version === 'number' &&
    Array.isArray(snapshot.people) &&
    snapshot.people.every(isPerson) &&
    Array.isArray(snapshot.events) &&
    snapshot.events.every(isEvent)
  );
}

function normalizeSnapshot(snapshot: ThreadMemoriesSnapshot): ThreadMemoriesSnapshot {
  const validPersonIds = new Set(snapshot.people.map((person) => person.id));
  const normalizedEvents = snapshot.events
    .map((event) => ({
      ...event,
      personIds: event.personIds.filter((personId) => validPersonIds.has(personId)),
    }))
    .filter((event) => event.personIds.length > 0);

  return {
    version: STORAGE_VERSION,
    people: snapshot.people,
    events: normalizedEvents,
  };
}

function migrateSnapshot(value: unknown): ThreadMemoriesSnapshot | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<ThreadMemoriesSnapshot> & {
    people?: unknown;
    events?: unknown;
    version?: unknown;
  };

  if (!Array.isArray(candidate.people) || !candidate.people.every(isPerson)) {
    return null;
  }

  if (!Array.isArray(candidate.events) || !candidate.events.every(isEvent)) {
    return null;
  }

  return normalizeSnapshot({
    version:
      typeof candidate.version === 'number' ? candidate.version : STORAGE_VERSION,
    people: candidate.people,
    events: candidate.events,
  });
}

export function loadThreadMemoriesSnapshot(): ThreadMemoriesSnapshot | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawSnapshot = window.localStorage.getItem(STORAGE_KEY);
    if (!rawSnapshot) {
      return null;
    }

    const parsedSnapshot = JSON.parse(rawSnapshot) as unknown;
    if (isSnapshot(parsedSnapshot)) {
      return normalizeSnapshot(parsedSnapshot);
    }

    return migrateSnapshot(parsedSnapshot);
  } catch (error) {
    console.warn('Failed to load thread memories from localStorage.', error);
    return null;
  }
}

export function saveThreadMemoriesSnapshot(snapshot: Omit<ThreadMemoriesSnapshot, 'version'>) {
  if (typeof window === 'undefined') {
    return;
  }

  const normalizedSnapshot = normalizeSnapshot({
    version: STORAGE_VERSION,
    ...snapshot,
  });

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedSnapshot));
  } catch (error) {
    console.warn('Failed to save thread memories to localStorage.', error);
  }
}
