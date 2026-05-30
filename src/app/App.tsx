import React, { useEffect, useRef, useState } from 'react';
import { Plus, Calendar, GitBranch, Users, Download, Upload } from 'lucide-react';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { ThreadCanvas } from './components/thread-canvas';
import { AddPersonDialog } from './components/add-person-dialog';
import { AddEventDialog } from './components/add-event-dialog';
import { EventDetailsSheet } from './components/event-details-sheet';
import { PeopleList } from './components/people-list';
import { EventsList } from './components/events-list';
import { Person, Event } from './types/thread-memories';
import {
  createThreadMemoriesSnapshot,
  loadThreadMemoriesSnapshot,
  parseThreadMemoriesSnapshot,
  saveThreadMemoriesSnapshot,
} from './thread-memory-storage';

interface TimelineFocusRequest {
  eventId: string;
  requestId: number;
}

interface TransferStatus {
  type: 'success' | 'error';
  message: string;
}

type LocationDeleteMode = 'liberate' | 'delete';

export default function App() {
  const [initialSnapshot] = useState(() => loadThreadMemoriesSnapshot());
  const [people, setPeople] = useState<Person[]>(() => initialSnapshot?.people ?? []);
  const [events, setEvents] = useState<Event[]>(() => initialSnapshot?.events ?? []);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [timelineFocusRequest, setTimelineFocusRequest] = useState<TimelineFocusRequest | null>(null);
  const [transferStatus, setTransferStatus] = useState<TransferStatus | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    saveThreadMemoriesSnapshot({ people, events });
  }, [people, events]);

  const resetTransientUiState = () => {
    setShowAddPerson(false);
    setShowAddEvent(false);
    setSelectedEvent(null);
    setShowEventDetails(false);
    setEditingPerson(null);
    setEditingEvent(null);
    setTimelineFocusRequest(null);
  };

  const addPerson = (name: string, color: string, photo?: string) => {
    const newPerson: Person = {
      id: `person-${Date.now()}`,
      name,
      color,
      photo,
    };
    setPeople([...people, newPerson]);
  };

  const updatePerson = (id: string, name: string, color: string, photo?: string) => {
    setPeople(people.map((p) => (p.id === id ? { ...p, name, color, photo } : p)));
    setEditingPerson(null);
  };

  const deletePerson = (id: string) => {
    setPeople(people.filter((p) => p.id !== id));
    setEvents(
      events
        .map((e) => ({
          ...e,
          personIds: e.personIds.filter((pid) => pid !== id),
        }))
        .filter((e) => e.personIds.length > 0),
    );
  };

  const addEvent = (
    title: string,
    personIds: string[],
    color: string,
    timestamp: number,
    interpretation?: string,
    location?: string,
  ) => {
    const newEvent: Event = {
      id: `event-${Date.now()}`,
      title,
      timestamp,
      personIds,
      color,
      location,
      interpretation,
    };
    setEvents([...events, newEvent]);
  };

  const updateEvent = (
    id: string,
    title: string,
    personIds: string[],
    color: string,
    timestamp: number,
    interpretation?: string,
    location?: string,
  ) => {
    setEvents(
      events.map((e) =>
        e.id === id
          ? {
              ...e,
              title,
              personIds,
              color,
              timestamp,
              location,
              interpretation,
            }
          : e,
      ),
    );
    setEditingEvent(null);
    setSelectedEvent(null);
    setShowEventDetails(false);
  };

  const deleteEvent = (id: string) => {
    setEvents(events.filter((e) => e.id !== id));
    setSelectedEvent(null);
    setShowEventDetails(false);
  };

  const renameLocation = (currentLocation: string, nextLocation: string) => {
    const normalizedCurrentLocation = currentLocation.trim();
    const normalizedNextLocation = nextLocation.trim();

    if (
      normalizedCurrentLocation.length === 0 ||
      normalizedNextLocation.length === 0 ||
      normalizedCurrentLocation === normalizedNextLocation
    ) {
      return;
    }

    setEvents((currentEvents) =>
      currentEvents.map((event) =>
        event.location === normalizedCurrentLocation
          ? {
              ...event,
              location: normalizedNextLocation,
            }
          : event,
      ),
    );
    setSelectedEvent((currentEvent) =>
      currentEvent?.location === normalizedCurrentLocation
        ? {
            ...currentEvent,
            location: normalizedNextLocation,
          }
        : currentEvent,
    );
    setEditingEvent((currentEvent) =>
      currentEvent?.location === normalizedCurrentLocation
        ? {
            ...currentEvent,
            location: normalizedNextLocation,
          }
        : currentEvent,
    );
  };

  const deleteLocation = (location: string, mode: LocationDeleteMode) => {
    const normalizedLocation = location.trim();

    if (!normalizedLocation) {
      return;
    }

    const selectedEventInLocation = selectedEvent?.location === normalizedLocation;

    setEvents((currentEvents) => {
      if (mode === 'delete') {
        return currentEvents.filter((event) => event.location !== normalizedLocation);
      }

      return currentEvents.map((event) =>
        event.location === normalizedLocation
          ? {
              ...event,
              location: undefined,
            }
          : event,
      );
    });

    if (mode === 'delete' && selectedEventInLocation) {
      setShowEventDetails(false);
    }

    setSelectedEvent((currentEvent) => {
      if (currentEvent?.location !== normalizedLocation) {
        return currentEvent;
      }

      if (mode === 'delete') {
        return null;
      }

      return {
        ...currentEvent,
        location: undefined,
      };
    });

    setEditingEvent((currentEvent) => {
      if (currentEvent?.location !== normalizedLocation) {
        return currentEvent;
      }

      if (mode === 'delete') {
        return null;
      }

      return {
        ...currentEvent,
        location: undefined,
      };
    });
  };

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setShowEventDetails(false);
  };

  const handleFocusEventOnTimeline = (event: Event) => {
    setTimelineFocusRequest((currentRequest) => ({
      eventId: event.id,
      requestId: (currentRequest?.requestId ?? 0) + 1,
    }));
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const rawSnapshot = await file.text();
      let parsedJson: unknown;

      try {
        parsedJson = JSON.parse(rawSnapshot) as unknown;
      } catch {
        throw new Error('The selected file is not valid JSON.');
      }

      const importedSnapshot = parseThreadMemoriesSnapshot(parsedJson);
      if (!importedSnapshot) {
        throw new Error('The selected file does not contain a valid Memory Forest timeline.');
      }

      setPeople(importedSnapshot.people);
      setEvents(importedSnapshot.events);
      resetTransientUiState();
      setTransferStatus({
        type: 'success',
        message: `Imported ${importedSnapshot.people.length} people and ${importedSnapshot.events.length} events from ${file.name}.`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to import the selected file.';
      setTransferStatus({
        type: 'error',
        message,
      });
    } finally {
      event.target.value = '';
    }
  };

  const handleExportClick = () => {
    const snapshot = createThreadMemoriesSnapshot({ people, events });
    const fileName = `memory-forest-${new Date().toISOString().slice(0, 10)}.json`;
    const fileContents = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([fileContents], { type: 'application/json' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = downloadUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(downloadUrl);

    setTransferStatus({
      type: 'success',
      message: `Exported ${people.length} people and ${events.length} events to ${fileName}.`,
    });
  };

  const usedColors = people.map((p) => p.color);

  return (
    <div className="memory-forest-app flex h-screen flex-col overflow-hidden">
      <header className="memory-forest-header shrink-0">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="memory-forest-logo-mark p-2">
                <GitBranch className="h-6 w-6" />
              </div>
              <div>
                <h1 className="memory-forest-title">Memory Forest</h1>
                <p className="memory-forest-subtitle text-sm">
                  Track group activities as connected timeline threads
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="memory-forest-stat flex items-center gap-2 px-3 py-1.5">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">{people.length} people</span>
              </div>
              <div className="memory-forest-stat flex items-center gap-2 px-3 py-1.5">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium">{events.length} events</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="memory-forest-workspace mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 overflow-hidden px-4 py-4 sm:px-6 sm:py-6">
        <div className="grid min-h-0 w-full gap-4 xl:grid-cols-[minmax(280px,320px)_minmax(0,1fr)] xl:gap-6">
          <aside className="grid min-h-0 gap-4 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-1 xl:content-start">
            <Card className="memory-forest-panel p-4">
              <h3 className="memory-forest-panel-heading mb-3 text-sm">Actions</h3>
              <div className="space-y-2">
                <Button
                  onClick={() => setShowAddPerson(true)}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Person
                </Button>
                <Button
                  onClick={() => setShowAddEvent(true)}
                  className="w-full justify-start"
                  variant="outline"
                  disabled={people.length === 0}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Event
                </Button>
              </div>
              {people.length === 0 && (
                <p className="mt-3 text-xs text-slate-500">Add people first to create events</p>
              )}
            </Card>

            <Card className="memory-forest-panel p-4">
              <EventsList
                events={events}
                people={people}
                onEdit={setEditingEvent}
                onDelete={deleteEvent}
                onDeleteLocation={deleteLocation}
                onView={handleEventClick}
                onFocusTimeline={handleFocusEventOnTimeline}
                selectedEventId={selectedEvent?.id ?? null}
              />
            </Card>

            <Card className="memory-forest-panel p-4">
              <h3 className="memory-forest-panel-heading mb-3 text-sm">People</h3>
              {people.length === 0 ? (
                <p className="text-sm text-slate-500">No people added yet</p>
              ) : (
                <PeopleList people={people} onEdit={setEditingPerson} onDelete={deletePerson} />
              )}
            </Card>

            <Card className="memory-forest-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="memory-forest-panel-heading text-sm">Import / Export</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Import replaces the current timeline.
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button onClick={handleImportClick} variant="outline" className="w-full">
                  <Upload className="h-4 w-4" />
                  Import JSON
                </Button>
                <Button onClick={handleExportClick} variant="outline" className="w-full">
                  <Download className="h-4 w-4" />
                  Export JSON
                </Button>
              </div>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleImportFileChange}
              />
              {transferStatus && (
                <div
                  className={`memory-forest-transfer mt-3 px-3 py-2 text-xs ${
                    transferStatus.type === 'error'
                      ? 'memory-forest-transfer-error'
                      : 'memory-forest-transfer-success'
                  }`}
                >
                  {transferStatus.message}
                </div>
              )}
            </Card>

            <Card className="memory-forest-help memory-forest-panel p-4 md:col-span-2 xl:col-span-1">
              <h3 className="memory-forest-panel-heading mb-3 text-sm">How it works</h3>
              <div className="space-y-2 text-xs">
                <p>- Vertical lines = threads (people or locations)</p>
                <p>- Dots = event nodes</p>
                <p>- Time flows bottom to top</p>
                <p>- Scroll the canvas to move through time</p>
                <p>- Use +/- or Ctrl/Cmd + wheel to zoom vertically</p>
                <p>- Lines connect threads to shared events</p>
                <p>- Click events to view details</p>
              </div>
            </Card>
          </aside>

          <div className="min-h-[420px] min-w-0 xl:h-full xl:min-h-0">
            <ThreadCanvas
              people={people}
              events={events}
              onEventClick={handleEventClick}
              focusRequest={timelineFocusRequest}
            />
          </div>
        </div>
      </main>

      <AddPersonDialog
        open={showAddPerson || !!editingPerson}
        onOpenChange={(open) => {
          setShowAddPerson(open);
          if (!open) setEditingPerson(null);
        }}
        onAdd={addPerson}
        onEdit={updatePerson}
        editingPerson={editingPerson}
        usedColors={usedColors}
      />

      <AddEventDialog
        open={showAddEvent || !!editingEvent}
        onOpenChange={(open) => {
          setShowAddEvent(open);
          if (!open) setEditingEvent(null);
        }}
        onAdd={addEvent}
        onUpdate={updateEvent}
        editingEvent={editingEvent}
        people={people}
      />

      <EventDetailsSheet
        open={showEventDetails}
        onOpenChange={setShowEventDetails}
        event={selectedEvent}
        events={events}
        people={people}
        onEdit={handleEditEvent}
        onDelete={deleteEvent}
        onRenameLocation={renameLocation}
      />
    </div>
  );
}
