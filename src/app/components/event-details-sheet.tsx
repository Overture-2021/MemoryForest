import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { Event, Person } from '../types/thread-memories';
import { Calendar, Users, Tag, MessageSquare, Pencil, Trash2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
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

interface EventDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event | null;
  people: Person[];
  onEdit?: (event: Event) => void;
  onDelete?: (id: string) => void;
}

export function EventDetailsSheet({ open, onOpenChange, event, people, onEdit, onDelete }: EventDetailsSheetProps) {
  if (!event) return null;

  const involvedPeople = people.filter(p => event.personIds.includes(p.id));
  const eventDate = new Date(event.timestamp);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: event.color }}
            />
            {event.title}
          </SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Timestamp */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Calendar className="w-4 h-4" />
              <span>Time</span>
            </div>
            <p className="text-sm pl-6">
              {eventDate.toLocaleString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>

          {/* People involved */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Users className="w-4 h-4" />
              <span>People Involved</span>
            </div>
            <div className="flex flex-wrap gap-2 pl-6">
              {involvedPeople.map(person => (
                <Badge
                  key={person.id}
                  variant="outline"
                  className="gap-2"
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: person.color }}
                  />
                  {person.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Thread ID */}
          {event.threadId && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Tag className="w-4 h-4" />
                <span>Event Thread</span>
              </div>
              <p className="text-sm pl-6 font-mono bg-slate-100 rounded px-2 py-1 inline-block">
                {event.threadId}
              </p>
            </div>
          )}

          {/* Interpretation */}
          {event.interpretation && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MessageSquare className="w-4 h-4" />
                <span>Interpretation</span>
              </div>
              <p className="text-sm pl-6 italic text-slate-700">
                "{event.interpretation}"
              </p>
            </div>
          )}

          {/* Color */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <div className="w-4 h-4" /> {/* Spacer */}
              <span>Event Color</span>
            </div>
            <div className="pl-6 flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-md border-2 border-slate-200"
                style={{ backgroundColor: event.color }}
              />
              <span className="text-xs font-mono text-slate-500">{event.color}</span>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-2">
            <Button
              onClick={() => onEdit?.(event)}
              className="w-full justify-start"
              variant="outline"
            >
              <Pencil className="w-4 h-4 mr-2" />
              Edit Event
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Event
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Event?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{event.title}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete?.(event.id)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}