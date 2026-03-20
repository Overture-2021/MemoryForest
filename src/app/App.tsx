import React, { useEffect, useState } from 'react';
import { Plus, Calendar, GitBranch, Users } from 'lucide-react';
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
  loadThreadMemoriesSnapshot,
  saveThreadMemoriesSnapshot,
} from './thread-memory-storage';

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

  useEffect(() => {
    saveThreadMemoriesSnapshot({ people, events });
  }, [people, events]);

  const addPerson = (name: string, color: string) => {
    const newPerson: Person = {
      id: `person-${Date.now()}`,
      name,
      color,
    };
    setPeople([...people, newPerson]);
  };

  const updatePerson = (id: string, name: string, color: string) => {
    setPeople(people.map((p) => (p.id === id ? { ...p, name, color } : p)));
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
    threadId?: string,
  ) => {
    const newEvent: Event = {
      id: `event-${Date.now()}`,
      title,
      timestamp,
      personIds,
      color,
      interpretation,
      threadId,
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
    threadId?: string,
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
              interpretation,
              threadId,
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

  const renameThreadId = (currentThreadId: string, nextThreadId: string) => {
    const normalizedCurrentThreadId = currentThreadId.trim();
    const normalizedNextThreadId = nextThreadId.trim();

    if (
      normalizedCurrentThreadId.length === 0 ||
      normalizedNextThreadId.length === 0 ||
      normalizedCurrentThreadId === normalizedNextThreadId
    ) {
      return;
    }

    setEvents((currentEvents) =>
      currentEvents.map((event) =>
        event.threadId === normalizedCurrentThreadId
          ? {
              ...event,
              threadId: normalizedNextThreadId,
            }
          : event,
      ),
    );
    setSelectedEvent((currentEvent) =>
      currentEvent?.threadId === normalizedCurrentThreadId
        ? {
            ...currentEvent,
            threadId: normalizedNextThreadId,
          }
        : currentEvent,
    );
    setEditingEvent((currentEvent) =>
      currentEvent?.threadId === normalizedCurrentThreadId
        ? {
            ...currentEvent,
            threadId: normalizedNextThreadId,
          }
        : currentEvent,
    );
  };

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setShowEventDetails(false);
  };

  const usedColors = people.map((p) => p.color);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="shrink-0 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 p-2">
                <GitBranch className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">ThreadMemories</h1>
                <p className="text-sm text-slate-600">
                  Track group activities as connected event threads
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5">
                <Users className="h-4 w-4 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">{people.length} people</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5">
                <Calendar className="h-4 w-4 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">{events.length} events</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 overflow-hidden px-4 py-4 sm:px-6 sm:py-6">
        <div className="grid min-h-0 w-full gap-4 xl:grid-cols-[minmax(280px,320px)_minmax(0,1fr)] xl:gap-6">
          <aside className="grid min-h-0 gap-4 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-1 xl:content-start">
            <Card className="p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">Actions</h3>
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

            <Card className="p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">People</h3>
              {people.length === 0 ? (
                <p className="text-sm text-slate-500">No people added yet</p>
              ) : (
                <PeopleList people={people} onEdit={setEditingPerson} onDelete={deletePerson} />
              )}
            </Card>

            <Card className="p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">Events</h3>
              {events.length === 0 ? (
                <p className="text-sm text-slate-500">No events added yet</p>
              ) : (
                <EventsList
                  events={events}
                  people={people}
                  onEdit={setEditingEvent}
                  onDelete={deleteEvent}
                  onView={handleEventClick}
                  selectedEventId={selectedEvent?.id ?? null}
                />
              )}
            </Card>

            <Card className="border-slate-200 bg-slate-50 p-4 md:col-span-2 xl:col-span-1">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">How it works</h3>
              <div className="space-y-2 text-xs text-slate-600">
                <p>- Vertical lines = threads (people or events)</p>
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
            <ThreadCanvas people={people} events={events} onEventClick={handleEventClick} />
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
        onRenameThread={renameThreadId}
      />
    </div>
  );
}
