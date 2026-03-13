import React, { useMemo } from "react";
import { Person, Event } from "../types/thread-memories";

interface ThreadCanvasProps {
  people: Person[];
  events: Event[];
  onEventClick?: (event: Event) => void;
}

const msPerDay = 24 * 60 * 60 * 1000;

export function ThreadCanvas({
  people,
  events,
  onEventClick,
}: ThreadCanvasProps) {
  const SVG_WIDTH = 1200;
  const SIDE_MARGIN = 100;

  const {
    threadPositions,
    eventNodes,
    allColumns,
    totalHeight,
    getY,
    gridLines,
    eventThreadRanges,
  } = useMemo(() => {
    if (people.length === 0 && events.length === 0) {
      return {
        threadPositions: new Map<string, number>(),
        eventNodes: [],
        allColumns: [],
        totalHeight: 800,
        getY: (t: number) => 0,
        gridLines: [],
        eventThreadRanges: new Map<
          string,
          { minY: number; maxY: number }
        >(),
      };
    }

    const timestamps = events.map((e) => e.timestamp);
    const hasEvents = timestamps.length > 0;

    // Default to current time if no events
    const minTime = hasEvents
      ? Math.min(...timestamps)
      : Date.now();
    const maxTime = hasEvents
      ? Math.max(...timestamps)
      : Date.now();

    const timeSpanMs = maxTime - minTime;
    const PADDING_MS = Math.max(7 * msPerDay, timeSpanMs * 0.1); // At least 1 week padding
    const paddedMinMs = minTime - PADDING_MS;
    const paddedMaxMs = maxTime + PADDING_MS;
    const totalSpanMs = paddedMaxMs - paddedMinMs;

    let TIME_SCALE = 20 / msPerDay; // 20px per day
    let calcHeight = totalSpanMs * TIME_SCALE;

    // Cap height to avoid performance issues, min 800px
    if (calcHeight > 15000) {
      TIME_SCALE = 15000 / totalSpanMs;
      calcHeight = 15000;
    } else if (calcHeight < 800) {
      TIME_SCALE = 800 / totalSpanMs;
      calcHeight = 800;
    }

    const totalHeight = calcHeight;
    // Y flows from top (newest) to bottom (oldest)
    const getY = (timestamp: number) =>
      (paddedMaxMs - timestamp) * TIME_SCALE;

    // Generate Grid lines (Dates)
    const gridLines: { time: number; label: string }[] = [];
    if (hasEvents) {
      const days = totalSpanMs / msPerDay;
      const minDate = new Date(paddedMinMs);
      const maxDate = new Date(paddedMaxMs);

      if (days <= 60) {
        // Daily markers
        const start = new Date(
          minDate.getFullYear(),
          minDate.getMonth(),
          minDate.getDate(),
        );
        for (
          let d = new Date(start);
          d.getTime() <= paddedMaxMs;
          d.setDate(d.getDate() + 1)
        ) {
          if (d.getTime() >= paddedMinMs) {
            gridLines.push({
              time: d.getTime(),
              label: d.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              }),
            });
          }
        }
      } else if (days <= 730) {
        // Monthly markers
        const start = new Date(
          minDate.getFullYear(),
          minDate.getMonth(),
          1,
        );
        for (
          let d = new Date(start);
          d.getTime() <= paddedMaxMs;
          d.setMonth(d.getMonth() + 1)
        ) {
          if (d.getTime() >= paddedMinMs) {
            gridLines.push({
              time: d.getTime(),
              label: d.toLocaleDateString(undefined, {
                month: "short",
                year: "numeric",
              }),
            });
          }
        }
      } else {
        // Yearly markers
        const start = new Date(minDate.getFullYear(), 0, 1);
        for (
          let d = new Date(start);
          d.getTime() <= paddedMaxMs;
          d.setFullYear(d.getFullYear() + 1)
        ) {
          if (d.getTime() >= paddedMinMs) {
            gridLines.push({
              time: d.getTime(),
              label: d.getFullYear().toString(),
            });
          }
        }
      }
    }

    const positions = new Map<string, number>();
    const eventThreads = new Set(
      events.map((e) => e.threadId).filter(Boolean) as string[],
    );

    const columns = [
      ...people.map((p) => ({
        id: p.id,
        type: "person" as const,
        name: p.name,
        color: p.color,
      })),
      ...Array.from(eventThreads).map((tid) => {
        const threadEvents = events.filter(
          (e) => e.threadId === tid,
        );
        return {
          id: tid,
          type: "eventThread" as const,
          name: tid,
          color: threadEvents[0]?.color || "#64748b",
        };
      }),
    ];

    const rightMargin = 150;
    const availableWidth =
      SVG_WIDTH - SIDE_MARGIN - rightMargin;
    const spacing =
      columns.length > 1
        ? availableWidth / (columns.length - 1)
        : availableWidth / 2;

    columns.forEach((col, index) => {
      positions.set(
        col.id,
        SIDE_MARGIN +
          (columns.length === 1
            ? availableWidth / 2
            : index * spacing),
      );
    });

    const eventThreadRanges = new Map<
      string,
      { minY: number; maxY: number }
    >();
    Array.from(eventThreads).forEach((tid) => {
      const threadEvents = events.filter(
        (e) => e.threadId === tid,
      );
      if (threadEvents.length > 0) {
        const tMin = Math.min(
          ...threadEvents.map((e) => e.timestamp),
        );
        const tMax = Math.max(
          ...threadEvents.map((e) => e.timestamp),
        );
        // minY is the top event (latest in time), maxY is the bottom event (earliest in time)
        eventThreadRanges.set(tid, {
          minY: getY(tMax),
          maxY: getY(tMin),
        });
      }
    });

    const nodes = events.map((event) => {
      const y = getY(event.timestamp);

      let x: number;
      if (event.threadId && positions.has(event.threadId)) {
        x = positions.get(event.threadId)!;
      } else {
        const personPositions = event.personIds
          .map((pid) => positions.get(pid))
          .filter((p): p is number => p !== undefined);
        x =
          personPositions.length > 0
            ? personPositions.reduce((a, b) => a + b, 0) /
              personPositions.length
            : SIDE_MARGIN + availableWidth / 2;
      }

      return { event, x, y };
    });

    return {
      threadPositions: positions,
      eventNodes: nodes,
      allColumns: columns,
      totalHeight,
      getY,
      gridLines,
      eventThreadRanges,
    };
  }, [people, events]);

  return (
    <div className="w-full h-full overflow-auto bg-slate-50 rounded-lg border border-slate-200 shadow-inner custom-scrollbar">
      <div
        style={{ width: SVG_WIDTH, minHeight: "100%" }}
        className="flex flex-col relative"
      >
        {/* Sticky Header for People/Thread Names */}
        <div className="sticky top-0 h-[60px] bg-white/95 backdrop-blur-md border-b border-slate-200 z-20 shrink-0 shadow-sm w-full">
          {allColumns.map((col) => {
            const x = threadPositions.get(col.id);
            if (x === undefined) return null;
            return (
              <div
                key={col.id}
                className="absolute top-0 flex flex-col items-center justify-center h-full -translate-x-1/2 transition-transform"
                style={{ left: x }}
              >
                <div
                  className="w-3 h-3 mb-1.5 shadow-sm"
                  style={{
                    backgroundColor: col.color,
                    borderRadius:
                      col.type === "eventThread"
                        ? "2px"
                        : "50%",
                  }}
                />
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded text-white whitespace-nowrap shadow-sm"
                  style={{ backgroundColor: col.color }}
                >
                  {col.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Timeline Canvas */}
        <div
          className="relative"
          style={{ height: totalHeight }}
        >
          <svg
            width="100%"
            height="100%"
            className="absolute inset-0"
          >
            {/* Horizontal Grid Lines (Dates) */}
            {gridLines.map((line, i) => {
              const y = getY(line.time);
              return (
                <g key={`grid-${i}`}>
                  <line
                    x1={SIDE_MARGIN - 20}
                    y1={y}
                    x2={SVG_WIDTH}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    strokeDasharray="4,4"
                  />
                  <text
                    x={SIDE_MARGIN - 30}
                    y={y + 4}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize="12"
                    fontWeight="500"
                    className="select-none pointer-events-none"
                  >
                    {line.label}
                  </text>
                </g>
              );
            })}

            {/* Vertical Thread Lines */}
            {allColumns.map((col) => {
              const x = threadPositions.get(col.id);
              if (x === undefined) return null;

              if (col.type === "person") {
                // People threads span full height, infinite up/down
                return (
                  <line
                    key={col.id}
                    x1={x}
                    y1={0}
                    x2={x}
                    y2={totalHeight}
                    stroke={col.color}
                    strokeWidth="2"
                    opacity="0.3"
                  />
                );
              } else {
                // Event threads span only their event ranges
                const range = eventThreadRanges.get(col.id);
                if (!range) return null;
                const startY = Math.max(0, range.minY - 40);
                const endY = Math.min(
                  totalHeight,
                  range.maxY + 40,
                );

                return (
                  <line
                    key={col.id}
                    x1={x}
                    y1={startY}
                    x2={x}
                    y2={endY}
                    stroke={col.color}
                    strokeWidth="4"
                    strokeDasharray="6,4"
                    opacity="0.4"
                  />
                );
              }
            })}

            {/* Connections between nodes and people */}
            {eventNodes.map(({ event, x, y }) => {
              return event.personIds.map((personId) => {
                const threadX = threadPositions.get(personId);
                if (threadX === undefined) return null;

                const person = people.find(
                  (p) => p.id === personId,
                );

                return (
                  <line
                    key={`${event.id}-${personId}`}
                    x1={threadX}
                    y1={y}
                    x2={x}
                    y2={y}
                    stroke={person?.color || "#64748b"}
                    strokeWidth="2"
                    opacity="0.5"
                  />
                );
              });
            })}

            {/* Event Nodes */}
            {eventNodes.map(({ event, x, y }) => (
              <g
                key={event.id}
                onClick={() => onEventClick?.(event)}
                className="cursor-pointer group"
              >
                {/* Node Circles */}
                <circle
                  cx={x}
                  cy={y}
                  r={8}
                  fill={event.color}
                  stroke="white"
                  strokeWidth="2"
                  className="transition-all duration-200 group-hover:r-[10]"
                  style={{
                    filter:
                      "drop-shadow(0px 2px 4px rgba(0,0,0,0.1))",
                  }}
                />
                <circle
                  cx={x}
                  cy={y}
                  r={14}
                  fill="transparent"
                  className="group-hover:fill-black group-hover:fill-opacity-5"
                />

                {/* Event Label Box */}
                <rect
                  x={x + 16}
                  y={y - (event.interpretation ? 24 : 16)}
                  width={Math.min(
                    200,
                    Math.max(120, event.title.length * 8),
                  )}
                  height={event.interpretation ? 48 : 32}
                  fill="white"
                  fillOpacity="0.95"
                  rx="6"
                  stroke="#e2e8f0"
                  strokeWidth="1"
                  className="pointer-events-none transition-all duration-200 group-hover:shadow-md group-hover:stroke-slate-300"
                />

                {/* Title */}
                <text
                  x={x + 24}
                  y={y - (event.interpretation ? 6 : -4)}
                  fontSize="13"
                  fontWeight="600"
                  fill="#1e293b"
                  className="pointer-events-none select-none"
                >
                  {event.title.length > 25
                    ? event.title.substring(0, 25) + "..."
                    : event.title}
                </text>

                {/* Date */}
                <text
                  x={x + 24}
                  y={y + (event.interpretation ? 8 : 10)}
                  fontSize="10"
                  fill="#64748b"
                  className="pointer-events-none select-none"
                >
                  {new Date(event.timestamp).toLocaleString(
                    undefined,
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    },
                  )}
                </text>

                {/* Interpretation */}
                {event.interpretation && (
                  <text
                    x={x + 24}
                    y={y + 18}
                    fontSize="11"
                    fill="#64748b"
                    fontStyle="italic"
                    className="pointer-events-none select-none"
                  >
                    {event.interpretation.length > 30
                      ? event.interpretation.substring(0, 30) +
                        "..."
                      : event.interpretation}
                  </text>
                )}
              </g>
            ))}

            {/* Empty State Overlay */}
            {events.length === 0 && people.length === 0 && (
              <text
                x="50%"
                y={totalHeight / 2}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="16"
                className="pointer-events-none"
              >
                Add people and events to start building your
                thread memory
              </text>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}