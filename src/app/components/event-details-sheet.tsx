import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { Event, Person } from '../types/thread-memories';
import { Calendar, MapPin, Users, MessageSquare, Pencil, Trash2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { formatDateTimeValue } from '../utils/date-format';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
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
  events: Event[];
  people: Person[];
  onEdit?: (event: Event) => void;
  onDelete?: (id: string) => void;
  onRenameLocation?: (currentLocation: string, nextLocation: string) => void;
}

export function EventDetailsSheet({
  open,
  onOpenChange,
  event,
  events,
  people,
  onEdit,
  onDelete,
  onRenameLocation,
}: EventDetailsSheetProps) {
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [nextLocation, setNextLocation] = useState('');

  useEffect(() => {
    if (!showRenameDialog) {
      setNextLocation(event?.location ?? '');
    }
  }, [event, showRenameDialog]);

  if (!event) return null;

  const involvedPeople = people.filter((p) => event.personIds.includes(p.id));
  const eventDate = new Date(event.timestamp);
  const relatedLocationEvents = event.location
    ? events.filter((candidateEvent) => candidateEvent.location === event.location)
    : [];
  const normalizedNextLocation = nextLocation.trim();
  const canRenameLocation =
    !!event.location &&
    normalizedNextLocation.length > 0 &&
    normalizedNextLocation !== event.location;

  const handleRenameLocation = () => {
    if (!event.location || !canRenameLocation) return;

    onRenameLocation?.(event.location, normalizedNextLocation);
    setShowRenameDialog(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-xl">
          <SheetHeader className="border-b px-6 py-6 pr-14">
            <SheetTitle className="flex items-start gap-3 text-left text-xl leading-tight">
              <div
                className="memory-forest-color-dot mt-1 h-4 w-4 shrink-0 rounded-full"
                style={{ backgroundColor: event.color }}
              />
              <span>{event.title}</span>
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-6 px-6 py-6">
            {/* Timestamp */}
            <div className="memory-forest-detail-note space-y-3 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <Calendar className="h-4 w-4 shrink-0" />
                <span>Time</span>
              </div>
              <p className="pl-6 text-sm leading-6 text-slate-800">
                {formatDateTimeValue(eventDate)}
              </p>
            </div>

            {event.location && (
              <div className="memory-forest-detail-note space-y-3 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>Location</span>
                </div>
                <div className="space-y-3 pl-6">
                  <p className="text-sm leading-6 text-slate-800">{event.location}</p>
                  <p className="text-xs text-slate-500">
                    Renaming this location will update all {relatedLocationEvents.length} events
                    grouped at it.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start sm:w-auto"
                    onClick={() => {
                      setNextLocation(event.location ?? '');
                      setShowRenameDialog(true);
                    }}
                  >
                    Rename Location
                  </Button>
                </div>
              </div>
            )}

            {/* People involved */}
            <div className="memory-forest-detail-note space-y-3 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <Users className="h-4 w-4 shrink-0" />
                <span>People Involved</span>
              </div>
              <div className="flex flex-wrap gap-2 pl-6">
                {involvedPeople.map((person) => (
                  <Badge
                    key={person.id}
                    variant="outline"
                    className="gap-2 px-3 py-1 text-sm"
                  >
                    <span
                      className="memory-forest-color-dot h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: person.color }}
                    />
                    {person.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Interpretation */}
            {event.interpretation && (
              <div className="memory-forest-detail-note space-y-3 p-4">
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
            <div className="memory-forest-detail-note space-y-3 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <div className="h-4 w-4 shrink-0" />
                <span>Event Color</span>
              </div>
              <div className="flex items-center gap-3 pl-6">
                <div
                  className="memory-forest-color-dot h-8 w-8 shrink-0 rounded-md border-2"
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
                className="memory-forest-sheet-action h-11 w-full justify-start px-4"
                variant="outline"
              >
                <Pencil className="mr-2 h-4 w-4 shrink-0" />
                Edit Event
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className="memory-forest-sheet-action h-11 w-full justify-start px-4"
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
                      Are you sure you want to delete "{event.title}"? This action cannot be
                      undone.
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

      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Location</DialogTitle>
            <DialogDescription>
              This will update all {relatedLocationEvents.length} events at{' '}
              <span className="font-mono">{event.location}</span>. If the new location already
              exists, those groups will merge.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="rename-location">New location</Label>
            <Input
              id="rename-location"
              value={nextLocation}
              onChange={(e) => setNextLocation(e.target.value)}
              placeholder="Enter the replacement location"
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleRenameLocation} disabled={!canRenameLocation}>
              Update Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
