import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from './ui/utils';
import { Person } from '../types/thread-memories';

interface PersonAvatarProps {
  person: Pick<Person, 'name' | 'color' | 'photo'>;
  className?: string;
  highlighted?: boolean;
  imageClassName?: string;
}

function getPersonInitial(name: string) {
  const trimmedName = name.trim();
  return trimmedName.charAt(0).toUpperCase() || '?';
}

export function PersonAvatar({
  person,
  className,
  highlighted = false,
  imageClassName,
}: PersonAvatarProps) {
  return (
    <Avatar
      className={cn('memory-forest-avatar border-2 bg-white shadow-sm', className)}
      style={{
        borderColor: person.color,
        boxShadow: highlighted
          ? `2px 3px 0 #1d1d1b, 0 0 0 4px ${person.color}22`
          : undefined,
      }}
    >
      {person.photo ? (
        <AvatarImage
          src={person.photo}
          alt={`${person.name} profile`}
          className={cn('object-cover', imageClassName)}
        />
      ) : null}
      <AvatarFallback
        className="text-xs font-semibold text-white"
        style={{ backgroundColor: person.color }}
      >
        {getPersonInitial(person.name)}
      </AvatarFallback>
    </Avatar>
  );
}
