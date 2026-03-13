import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Person } from '../types/thread-memories';
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

interface PeopleListProps {
  people: Person[];
  onEdit: (person: Person) => void;
  onDelete: (id: string) => void;
}

export function PeopleList({ people, onEdit, onDelete }: PeopleListProps) {
  return (
    <div className="space-y-2">
      {people.map(person => (
        <div 
          key={person.id} 
          className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 group"
        >
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: person.color }}
          />
          <span className="text-sm flex-1">{person.name}</span>
          
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(person)}
              className="h-7 w-7 p-0"
            >
              <Pencil className="w-3 h-3" />
              <span className="sr-only">Edit {person.name}</span>
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="w-3 h-3" />
                  <span className="sr-only">Delete {person.name}</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {person.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove {person.name} from all events. Events with no remaining people will be deleted. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(person.id)}
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
