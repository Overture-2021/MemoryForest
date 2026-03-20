import { useEffect, useState } from 'react';
import { ChevronRight, Clock, Folder, FolderOpen, LocateFixed, Pencil, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Event, Person } from '../types/thread-memories';
import { formatDateInputValue } from '../utils/date-format';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

interface EventsListProps {
  events: Event[];
  people: Person[];
  onEdit: (event: Event) => void;
  onDelete: (id: string) => void;
  onView?: (event: Event) => void;
  onFocusTimeline?: (event: Event) => void;
  selectedEventId?: string | null;
}

interface EventGroup {
  id: string;
  label: string;
  events: Event[];
  latestTimestamp: number;
  color: string;
}

const UNTHREADED_GROUP_ID = '__unthreaded__';

const getEventGroupId = (event: Event) => event.threadId?.trim() || UNTHREADED_GROUP_ID;

export function EventsList({
  events,
  people,
  onEdit,
  onDelete,
  onView,
  onFocusTimeline,
  selectedEventId,
}: EventsListProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const getRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return formatDateInputValue(new Date(timestamp));
  };

  const getPeopleNames = (personIds: string[]) =>
    personIds
      .map((id) => people.find((person) => person.id === id)?.name)
      .filter(Boolean)
      .join(', ');

  const eventGroups = events.reduce<EventGroup[]>((groups, event) => {
    const normalizedThreadId = event.threadId?.trim();
    const groupId = getEventGroupId(event);
    const existingGroup = groups.find((group) => group.id === groupId);

    if (existingGroup) {
      existingGroup.events.push(event);
      existingGroup.latestTimestamp = Math.max(existingGroup.latestTimestamp, event.timestamp);
      return groups;
    }

    groups.push({
      id: groupId,
      label: normalizedThreadId || 'Standalone Events',
      events: [event],
      latestTimestamp: event.timestamp,
      color: event.color,
    });

    return groups;
  }, []);

  eventGroups.forEach((group) => {
    group.events.sort((a, b) => b.timestamp - a.timestamp);
  });
  eventGroups.sort((a, b) => {
    if (a.id === UNTHREADED_GROUP_ID) return -1;
    if (b.id === UNTHREADED_GROUP_ID) return 1;
    return b.latestTimestamp - a.latestTimestamp;
  });

  useEffect(() => {
    setExpandedGroups((currentGroups) => {
      const nextGroups = eventGroups.reduce<Record<string, boolean>>((accumulator, group) => {
        accumulator[group.id] = currentGroups[group.id] ?? false;
        return accumulator;
      }, {});

      const currentEvent = events.find((event) => event.id === selectedEventId);
      if (currentEvent) {
        nextGroups[getEventGroupId(currentEvent)] = true;
      }

      const currentGroupIds = Object.keys(currentGroups);
      const nextGroupIds = Object.keys(nextGroups);

      if (
        currentGroupIds.length === nextGroupIds.length &&
        nextGroupIds.every((groupId) => currentGroups[groupId] === nextGroups[groupId])
      ) {
        return currentGroups;
      }

      return nextGroups;
    });
  }, [eventGroups, events, selectedEventId]);

  const toggleGroup = (groupId: string, open: boolean) => {
    setExpandedGroups((currentGroups) => ({
      ...currentGroups,
      [groupId]: open,
    }));
  };

  return (
    <div className="space-y-2">
      {eventGroups.map((group) => {
        const isOpen = expandedGroups[group.id] ?? true;

        return (
          <Collapsible
            key={group.id}
            open={isOpen}
            onOpenChange={(open) => toggleGroup(group.id, open)}
          >
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70">
              <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left hover:bg-white/70">
                <ChevronRight
                  className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${
                    isOpen ? 'rotate-90' : ''
                  }`}
                />
                {isOpen ? (
                  <FolderOpen className="h-4 w-4 shrink-0 text-slate-600" />
                ) : (
                  <Folder className="h-4 w-4 shrink-0 text-slate-600" />
                )}
                <div
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: group.color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-800">{group.label}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                    <span>
                      {group.events.length} event{group.events.length === 1 ? '' : 's'}
                    </span>
                    <span aria-hidden="true">{'\u2022'}</span>
                    <span>{getRelativeTime(group.latestTimestamp)}</span>
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-1 border-t border-slate-200/80 px-2 py-2">
                {group.events.map((event) => {
                  const isSelected = event.id === selectedEventId;

                  return (
                    <div
                      key={event.id}
                      className={`group flex cursor-pointer items-start gap-2 rounded-lg p-2 transition-colors ${
                        isSelected ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-white'
                      }`}
                      onClick={() => onView?.(event)}
                    >
                      <div
                        className="mt-0.5 h-3 w-3 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: event.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-slate-800">
                          {event.title}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="h-3 w-3" />
                          <span>{getRelativeTime(event.timestamp)}</span>
                        </div>
                        {event.personIds.length > 0 && (
                          <div className="mt-0.5 truncate text-xs text-slate-500">
                            {getPeopleNames(event.personIds)}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onFocusTimeline?.(event);
                          }}
                          className="h-7 w-7 p-0"
                          title="Center on timeline at 1281% zoom"
                        >
                          <LocateFixed className="h-3 w-3" />
                          <span className="sr-only">
                            Center {event.title} on the timeline at 1281% zoom
                          </span>
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(event);
                          }}
                          className="h-7 w-7 p-0"
                        >
                          <Pencil className="h-3 w-3" />
                          <span className="sr-only">Edit {event.title}</span>
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => e.stopPropagation()}
                              className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span className="sr-only">Delete {event.title}</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete "{event.title}"?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this event. This action cannot be
                                undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDelete(event.id);
                                }}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  );
                })}
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}
    </div>
  );
}
