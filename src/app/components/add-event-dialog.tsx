import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Person, Event, EVENT_COLORS } from '../types/thread-memories';
import { formatDateInputValue, formatTimeValue, isValidDateInputValue } from '../utils/date-format';

interface AddEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (
    title: string,
    personIds: string[],
    color: string,
    timestamp: number,
    interpretation?: string,
    location?: string,
  ) => void;
  onUpdate?: (
    id: string,
    title: string,
    personIds: string[],
    color: string,
    timestamp: number,
    interpretation?: string,
    location?: string,
  ) => void;
  editingEvent?: Event | null;
  people: Person[];
}

export function AddEventDialog({ open, onOpenChange, onAdd, onUpdate, editingEvent, people }: AddEventDialogProps) {
  const isEditing = !!editingEvent;
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [interpretation, setInterpretation] = useState('');
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState(EVENT_COLORS[0]);
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const isEventDateValid = isValidDateInputValue(eventDate);

  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title);
      setLocation(editingEvent.location || '');
      setInterpretation(editingEvent.interpretation || '');
      setSelectedPeople(editingEvent.personIds);
      setSelectedColor(editingEvent.color);

      // Convert timestamp to date and time
      const date = new Date(editingEvent.timestamp);
      const dateStr = formatDateInputValue(date);
      setEventDate(dateStr);
      setEventTime(formatTimeValue(date));
    } else {
      setTitle('');
      setLocation('');
      setInterpretation('');
      setSelectedPeople([]);
      setSelectedColor(EVENT_COLORS[0]);

      // Default to current date
      const now = new Date();
      setEventDate(formatDateInputValue(now));
      setEventTime('');
    }
  }, [editingEvent, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && selectedPeople.length > 0 && isEventDateValid) {
      // Create timestamp from date and optional time
      const [year, month, day] = eventDate.split('-').map(Number);
      let hours = 0;
      let minutes = 0;
      
      if (eventTime) {
        const [h, m] = eventTime.split(':').map(Number);
        hours = h;
        minutes = m;
      }
      
      const timestamp = new Date(year, month - 1, day, hours, minutes).getTime();
      
      if (isEditing && editingEvent && onUpdate) {
        onUpdate(
          editingEvent.id,
          title.trim(),
          selectedPeople,
          selectedColor,
          timestamp,
          interpretation.trim() || undefined,
          location.trim() || undefined
        );
      } else {
        onAdd(
          title.trim(),
          selectedPeople,
          selectedColor,
          timestamp,
          interpretation.trim() || undefined,
          location.trim() || undefined
        );
      }
      setTitle('');
      setLocation('');
      setInterpretation('');
      setSelectedPeople([]);
      setEventTime('');
      onOpenChange(false);
    }
  };

  const togglePerson = (personId: string) => {
    setSelectedPeople(prev =>
      prev.includes(personId)
        ? prev.filter(id => id !== personId)
        : [...prev, personId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="shrink-0 border-b px-6 py-6">
          <DialogTitle>{isEditing ? 'Edit Event' : 'Add Event'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="event-title">Event Title</Label>
              <Input
                id="event-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="E.g., Team lunch, Project kickoff"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-location">Location (Optional)</Label>
              <Input
                id="event-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="E.g., Central Park, New York"
              />
              <p className="text-xs text-slate-500">
                Events that share a location are grouped together
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-interpretation">Interpretation (Optional)</Label>
              <Input
                id="event-interpretation"
                value={interpretation}
                onChange={(e) => setInterpretation(e.target.value)}
                placeholder="Your custom meaning for this event"
              />
            </div>

            <div className="space-y-2">
              <Label>People Involved</Label>
              {people.length === 0 ? (
                <p className="text-sm text-slate-500">Add people first to create events</p>
              ) : (
                <div className="memory-forest-form-box max-h-40 space-y-2 overflow-y-auto p-3">
                  {people.map(person => (
                    <div key={person.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`person-${person.id}`}
                        checked={selectedPeople.includes(person.id)}
                        onCheckedChange={() => togglePerson(person.id)}
                      />
                      <label
                        htmlFor={`person-${person.id}`}
                        className="flex items-center gap-2 cursor-pointer flex-1"
                      >
                        <div
                          className="memory-forest-color-dot h-3 w-3 rounded-full"
                          style={{ backgroundColor: person.color }}
                        />
                        <span className="text-sm">{person.name}</span>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Event Color</Label>
              <div className="flex gap-2 flex-wrap">
                {EVENT_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className="memory-forest-color-swatch h-10 w-10 border-2 transition-all hover:scale-110"
                    style={{
                      backgroundColor: color,
                      outline: selectedColor === color ? '3px solid rgba(29, 29, 27, 0.55)' : undefined,
                      outlineOffset: selectedColor === color ? '3px' : undefined,
                    }}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-date">Event Date</Label>
              <Input
                id="event-date"
                type="text"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                inputMode="numeric"
                placeholder="yyyy-mm-dd"
                pattern="\d{4}-\d{2}-\d{2}"
                aria-invalid={eventDate.length > 0 && !isEventDateValid}
                required
              />
              <p className="text-xs text-slate-500">Use format yyyy-mm-dd</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-time">Event Time (Optional)</Label>
              <Input
                id="event-time"
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || selectedPeople.length === 0 || !isEventDateValid}>
              {isEditing ? 'Update' : 'Add Event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
