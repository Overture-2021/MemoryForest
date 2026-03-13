import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { PERSON_COLORS, Person } from '../types/thread-memories';

interface AddPersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (name: string, color: string) => void;
  onEdit?: (id: string, name: string, color: string) => void;
  editingPerson?: Person | null;
  usedColors: string[];
}

export function AddPersonDialog({ open, onOpenChange, onAdd, onEdit, editingPerson, usedColors }: AddPersonDialogProps) {
  const isEditing = !!editingPerson;
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(
    PERSON_COLORS.find(c => !usedColors.includes(c)) || PERSON_COLORS[0]
  );

  useEffect(() => {
    if (editingPerson) {
      setName(editingPerson.name);
      setSelectedColor(editingPerson.color);
    } else {
      setName('');
      setSelectedColor(PERSON_COLORS.find(c => !usedColors.includes(c)) || PERSON_COLORS[0]);
    }
  }, [editingPerson, usedColors]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      if (isEditing && editingPerson && onEdit) {
        onEdit(editingPerson.id, name.trim(), selectedColor);
      } else {
        onAdd(name.trim(), selectedColor);
      }
      setName('');
      setSelectedColor(PERSON_COLORS.find(c => !usedColors.includes(c) && c !== selectedColor) || PERSON_COLORS[0]);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Person' : 'Add Person'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="person-name">Name</Label>
              <Input
                id="person-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter person's name"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Thread Color</Label>
              <div className="flex gap-2 flex-wrap">
                {PERSON_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className="w-10 h-10 rounded-full border-2 transition-all hover:scale-110"
                    style={{
                      backgroundColor: color,
                      borderColor: selectedColor === color ? '#1e293b' : 'white',
                      boxShadow: selectedColor === color ? '0 0 0 2px white, 0 0 0 4px #1e293b' : '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              {isEditing ? 'Update' : 'Add Person'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}