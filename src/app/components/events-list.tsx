import React from 'react';
import { Pencil, Trash2, Clock } from 'lucide-react';
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

interface EventsListProps {
  events: Event[];
  people: Person[];
  onEdit: (event: Event) => void;
  onDelete: (id: string) => void;
  onView?: (event: Event) => void;
}

export function EventsList({ events, people, onEdit, onDelete, onView }: EventsListProps) {
  // Sort events by timestamp (newest first)
  const sortedEvents = [...events].sort((a, b) => b.timestamp - a.timestamp);

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
    
    const date = new Date(timestamp);
    return formatDateInputValue(date);
  };

  const getPeopleNames = (personIds: string[]) => {
    return personIds
      .map(id => people.find(p => p.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  return (
    <div className="space-y-2">
      {sortedEvents.map(event => (
        <div 
          key={event.id} 
          className="flex items-start gap-2 p-2 rounded hover:bg-slate-50 group cursor-pointer"
          onClick={() => onView?.(event)}
        >
          <div
            className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
            style={{ backgroundColor: event.color }}
          />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{event.title}</div>
            <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
              <Clock className="w-3 h-3" />
              <span>{getRelativeTime(event.timestamp)}</span>
            </div>
            {event.personIds.length > 0 && (
              <div className="text-xs text-slate-500 truncate mt-0.5">
                {getPeopleNames(event.personIds)}
              </div>
            )}
          </div>
          
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(event);
              }}
              className="h-7 w-7 p-0"
            >
              <Pencil className="w-3 h-3" />
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
                  <Trash2 className="w-3 h-3" />
                  <span className="sr-only">Delete {event.title}</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete "{event.title}"?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this event. This action cannot be undone.
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
      ))}
    </div>
  );
}
