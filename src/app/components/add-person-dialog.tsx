import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { PERSON_COLORS, Person } from '../types/thread-memories';
import { PersonAvatar } from './person-avatar';

interface AddPersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (name: string, color: string, photo?: string) => void;
  onEdit?: (id: string, name: string, color: string, photo?: string) => void;
  editingPerson?: Person | null;
  usedColors: string[];
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load the selected image.'));
    image.src = src;
  });
}

async function convertImageToProfilePhoto(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const maxDimension = 256;
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to prepare the selected image.');
    }

    context.drawImage(image, 0, 0, width, height);

    return canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.86);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function AddPersonDialog({
  open,
  onOpenChange,
  onAdd,
  onEdit,
  editingPerson,
  usedColors,
}: AddPersonDialogProps) {
  const isEditing = !!editingPerson;
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [selectedColor, setSelectedColor] = useState(
    PERSON_COLORS.find(c => !usedColors.includes(c)) || PERSON_COLORS[0]
  );

  useEffect(() => {
    if (editingPerson) {
      setName(editingPerson.name);
      setSelectedColor(editingPerson.color);
      setPhoto(editingPerson.photo);
    } else {
      setName('');
      setSelectedColor(PERSON_COLORS.find(c => !usedColors.includes(c)) || PERSON_COLORS[0]);
      setPhoto(undefined);
    }
    setPhotoError(null);
    setIsProcessingPhoto(false);
  }, [editingPerson, usedColors]);

  const handlePhotoSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      setIsProcessingPhoto(true);
      setPhotoError(null);
      const nextPhoto = await convertImageToProfilePhoto(file);
      setPhoto(nextPhoto);
    } catch (error) {
      setPhotoError(
        error instanceof Error ? error.message : 'Failed to process the selected image.',
      );
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      if (isEditing && editingPerson && onEdit) {
        onEdit(editingPerson.id, name.trim(), selectedColor, photo);
      } else {
        onAdd(name.trim(), selectedColor, photo);
      }
      setName('');
      setPhoto(undefined);
      setPhotoError(null);
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
              <Label>Profile Photo</Label>
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <PersonAvatar
                  person={{
                    name: name.trim() || 'Person',
                    color: selectedColor,
                    photo,
                  }}
                  className="size-14"
                />
                <div className="min-w-[180px] flex-1">
                  <p className="text-sm font-medium text-slate-700">
                    {photo ? 'Photo ready' : 'No photo selected'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Shown in the people list and above the timeline thread.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={isProcessingPhoto}
                  >
                    {isProcessingPhoto ? 'Processing...' : photo ? 'Replace Photo' : 'Upload Photo'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setPhoto(undefined)}
                    disabled={!photo || isProcessingPhoto}
                  >
                    Remove
                  </Button>
                </div>
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoSelection}
              />
              {photoError ? <p className="text-xs text-red-600">{photoError}</p> : null}
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
