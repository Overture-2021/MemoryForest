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

  const involvedPeople = people.filter((p) => event.personIds.includes(p.id));
  const eventDate = new Date(event.timestamp);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-xl">
        <SheetHeader className="border-b border-slate-200 px-6 py-6 pr-14">
          <SheetTitle className="flex items-start gap-3 text-left text-xl leading-tight">
            <div
              className="mt-1 h-4 w-4 shrink-0 rounded-full"
              style={{ backgroundColor: event.color }}
            />
            <span>{event.title}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 px-6 py-6">
          {/* Timestamp */}
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>Time</span>
            </div>
            <p className="pl-6 text-sm leading-6 text-slate-800">
              {eventDate.toLocaleString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>

          {/* People involved */}
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <Users className="h-4 w-4 shrink-0" />
              <span>People Involved</span>
            </div>
            <div className="flex flex-wrap gap-2 pl-6">
              {involvedPeople.map((person) => (
                <Badge
                  key={person.id}
                  variant="outline"
                  className="gap-2 rounded-full border-slate-300 bg-white px-3 py-1 text-sm"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: person.color }}
                  />
                  {person.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Thread ID */}
          {event.threadId && (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <Tag className="h-4 w-4 shrink-0" />
                <span>Event Thread</span>
              </div>
              <p className="inline-flex max-w-full items-center overflow-hidden rounded-lg bg-white px-3 py-1.5 pl-6 font-mono text-sm text-slate-700 shadow-sm ring-1 ring-slate-200">
                {event.threadId}
              </p>
            </div>
          )}

          {/* Interpretation */}
          {event.interpretation && (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span>Interpretation</span>
              </div>
              <p className="pl-6 text-sm italic leading-6 text-slate-700">
                "{event.interpretation}"
              </p>
            </div>
          )}

          {/* Color */}
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <div className="h-4 w-4 shrink-0" />
              <span>Event Color</span>
            </div>
            <div className="flex items-center gap-3 pl-6">
              <div
                className="h-8 w-8 shrink-0 rounded-md border-2 border-slate-200"
                style={{ backgroundColor: event.color }}
              />
              <span className="text-xs font-mono text-slate-500">{event.color}</span>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={() => onEdit?.(event)}
              className="h-11 w-full justify-start px-4"
              variant="outline"
            >
              <Pencil className="mr-2 h-4 w-4 shrink-0" />
              Edit Event
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="h-11 w-full justify-start px-4"
                  variant="outline"
                >
                  <Trash2 className="mr-2 h-4 w-4 shrink-0" />
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
