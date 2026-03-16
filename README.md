# Memory Forest

> “The past is never dead. It’s not even past.”  
> — William Faulkner

Memory Forest is a frontend prototype for exploring shared memories and group activities as connected timeline threads.

The current in-app name, `ThreadMemories`, is a temporary development name. 

## What The App Does

The app lets you:

- add people, each with their own thread color
- add events tied to one or more people
- optionally group events with an event thread ID
- view those relationships on a visual timeline canvas
- inspect, edit, and delete people and events from the sidebar UI

The main canvas renders:

- vertical person threads
- optional event-thread columns
- horizontal connections between people and events
- event nodes positioned by time

Time flows from bottom to top in the visualization.

## Current State

This repository is currently a client-side prototype:

- data is stored in React component state
- there is no backend or persistence layer
- refreshing the page clears the current data

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- Radix UI / shadcn-style UI components
- TypeScript

## Project Structure

- `src/app/App.tsx`: main application shell and state management
- `src/app/components/thread-canvas.tsx`: SVG timeline/thread visualization
- `src/app/components/add-person-dialog.tsx`: person creation and editing
- `src/app/components/add-event-dialog.tsx`: event creation and editing
- `src/app/components/event-details-sheet.tsx`: event detail view
- `src/app/types/thread-memories.ts`: domain types for people and events

## Running The App

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```



