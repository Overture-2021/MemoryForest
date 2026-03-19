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
- there is no backend layer

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- Radix UI / shadcn-style UI components
- TypeScript

## Prerequisites

Before you start, install:

- Git
- Node.js 18 or newer
- npm 9 or newer

You can verify your local tools with:

```bash
node -v
npm -v
git --version
```

## Project Structure

- `src/app/App.tsx`: main application shell and state management
- `src/app/components/thread-canvas.tsx`: SVG timeline/thread visualization
- `src/app/components/add-person-dialog.tsx`: person creation and editing
- `src/app/components/add-event-dialog.tsx`: event creation and editing
- `src/app/components/event-details-sheet.tsx`: event detail view
- `src/app/types/thread-memories.ts`: domain types for people and events

## Setup And Run

### 1. Clone the repository


```bash
git clone https://github.com/Overture-2021/MemoryForest.git
cd MemoryForest
```

### 2. Install project dependencies

```bash
npm install
```

This project includes a `package-lock.json`, so `npm install` should pull the full dependency tree used by the app.

### 3. Install React manually only if npm reports missing peer dependencies

The repo currently declares `react` and `react-dom` as peer dependencies. On most modern npm setups they will already be resolved correctly during install, but if you see errors about missing `react` or `react-dom`, run:

```bash
npm install react@18.3.1 react-dom@18.3.1
```

You should not need any other manual system packages or non-npm dependencies for local development.

### 4. Start the Vite development server

```bash
npm run dev
```

Vite will print a local URL in the terminal, usually:

```text
http://localhost:5173/
```

Open that URL in your browser. If port `5173` is already in use, Vite may choose a different local port.

### 5. Create a production build

```bash
npm run build
```

The production output is written to `dist/`.


