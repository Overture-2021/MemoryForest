import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Person, Event } from '../types/thread-memories';

interface ThreadCanvasProps {
  people: Person[];
  events: Event[];
  onEventClick?: (event: Event) => void;
}

const msPerDay = 24 * 60 * 60 * 1000;
const MIN_CANVAS_WIDTH = 280;
const EVENT_NODE_RADIUS = 8;
const EVENT_NODE_GAP = 6;
const EVENT_LABEL_MARGIN = 12;
const EVENT_LABEL_GAP = 10;
const EVENT_LABEL_HORIZONTAL_PADDING = 12;
const EVENT_LABEL_VERTICAL_PADDING = 10;
const EVENT_LABEL_TITLE_LINE_HEIGHT = 15;
const EVENT_LABEL_META_LINE_HEIGHT = 12;
const EVENT_LABEL_SECTION_GAP = 6;
const EVENT_TAG_HEIGHT = 22;
const EVENT_TAG_GAP = 8;

interface BoxLayout {
  height: number;
  id: string;
  width: number;
  x: number;
  y: number;
}

interface EventLabelLayout {
  connectorX: number;
  height: number;
  interpretationLines: string[];
  metaLabel: string;
  textX: number;
  titleLines: string[];
  width: number;
  x: number;
  y: number;
}

interface EventThreadTagLayout {
  dotX: number;
  height: number;
  id: string;
  label: string;
  textX: number;
  width: number;
  x: number;
  y: number;
}

function getPersonEventConnectorPath(
  threadX: number,
  eventX: number,
  eventY: number,
  personIndex: number,
  totalPeople: number,
) {
  const distance = Math.abs(eventX - threadX);
  const baseCurveHeight = clamp(distance * 0.22, 20, 56);
  const centeredIndex = personIndex - (totalPeople - 1) / 2;
  const fanHeight = Math.abs(centeredIndex) * 8;
  const controlY = eventY + baseCurveHeight + fanHeight;

  return `M ${threadX} ${eventY} C ${threadX} ${controlY}, ${eventX} ${controlY}, ${eventX} ${eventY}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function truncateText(text: string, maxChars: number) {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(1, maxChars - 1)).trimEnd()}...`;
}

function wrapText(text: string, maxChars: number, maxLines: number) {
  const normalized = text.trim().replace(/\s+/g, ' ');
  if (!normalized) return [];

  const words = normalized.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length <= maxChars) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
      currentLine = '';
    }

    if (lines.length === maxLines) {
      break;
    }

    if (word.length > maxChars) {
      lines.push(truncateText(word, maxChars));
    } else {
      currentLine = word;
    }

    if (lines.length === maxLines) {
      break;
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  if (lines.length === 0) {
    lines.push(truncateText(normalized, maxChars));
  }

  const overflowed = normalized !== lines.join(' ');
  if (overflowed) {
    lines[lines.length - 1] = truncateText(lines[lines.length - 1], maxChars);
  }

  return lines.slice(0, maxLines);
}

function rangesOverlap(startA: number, endA: number, startB: number, endB: number, padding = 0) {
  return startA < endB + padding && startB < endA + padding;
}

function resolveVerticalCollisions<T extends BoxLayout>(
  layouts: T[],
  minY: number,
  maxY: number,
  gap: number,
) {
  const initial = layouts
    .map((layout) => ({
      ...layout,
      y: clamp(layout.y, minY, Math.max(minY, maxY - layout.height)),
    }))
    .sort((a, b) => a.y - b.y);

  const forwardPass: T[] = [];
  for (const layout of initial) {
    let nextY = layout.y;
    for (const placed of forwardPass) {
      if (
        rangesOverlap(layout.x, layout.x + layout.width, placed.x, placed.x + placed.width, gap) &&
        nextY < placed.y + placed.height + gap
      ) {
        nextY = placed.y + placed.height + gap;
      }
    }

    forwardPass.push({
      ...layout,
      y: Math.min(nextY, Math.max(minY, maxY - layout.height)),
    });
  }

  const resolved = [...forwardPass].sort((a, b) => b.y - a.y);
  const backwardPass: T[] = [];
  for (const layout of resolved) {
    let nextY = layout.y;
    for (const placed of backwardPass) {
      if (
        rangesOverlap(layout.x, layout.x + layout.width, placed.x, placed.x + placed.width, gap)
      ) {
        nextY = Math.min(nextY, placed.y - gap - layout.height);
      }
    }

    backwardPass.push({
      ...layout,
      y: Math.max(minY, nextY),
    });
  }

  const yById = new Map(backwardPass.map((layout) => [layout.id, layout.y]));
  return layouts.map((layout) => ({
    ...layout,
    y: yById.get(layout.id) ?? layout.y,
  }));
}

function getEventLabelLayout(
  x: number,
  y: number,
  svgWidth: number,
  title: string,
  interpretation: string | undefined,
  timestamp: number,
  participantCount: number,
): EventLabelLayout {
  const maxWidth = Math.max(120, Math.min(240, svgWidth - 24));
  const minWidth = Math.min(136, maxWidth);
  const maxChars = Math.max(
    18,
    Math.floor((Math.min(maxWidth, Math.max(minWidth, title.length * 6.8 + 24)) - 24) / 6.8),
  );
  const titleLines = wrapText(title, maxChars, 2);
  const interpretationLines = interpretation ? wrapText(interpretation, maxChars, 2) : [];
  const dateLabel = new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const participantLabel = `${participantCount} ☺︎`;
  const metaLabel = `${dateLabel} • ${participantLabel}`;
  const longestLine = Math.max(
    ...titleLines.map((line) => line.length),
    ...interpretationLines.map((line) => line.length),
    metaLabel.length,
    16,
  );
  const width = clamp(longestLine * 6.6 + EVENT_LABEL_HORIZONTAL_PADDING * 2, minWidth, maxWidth);
  const preferredRightX = x + 16;
  const placeOnRight = preferredRightX + width <= svgWidth - 12 || x < svgWidth / 2;
  const labelX = placeOnRight
    ? Math.min(preferredRightX, svgWidth - width - 12)
    : Math.max(12, x - width - 16);
  const titleHeight = titleLines.length * EVENT_LABEL_TITLE_LINE_HEIGHT;
  const interpretationHeight = interpretationLines.length * EVENT_LABEL_META_LINE_HEIGHT;
  const height =
    EVENT_LABEL_VERTICAL_PADDING * 2 +
    titleHeight +
    EVENT_LABEL_SECTION_GAP +
    EVENT_LABEL_META_LINE_HEIGHT +
    (interpretationLines.length > 0
      ? EVENT_LABEL_SECTION_GAP + interpretationHeight
      : 0);

  return {
    connectorX: placeOnRight ? labelX : labelX + width,
    height,
    interpretationLines,
    metaLabel,
    textX: labelX + EVENT_LABEL_HORIZONTAL_PADDING,
    titleLines,
    width,
    x: labelX,
    y: y - height / 2,
  };
}

function getThreadTagLayout(id: string, x: number, y: number, svgWidth: number, name: string) {
  const maxWidth = Math.max(90, Math.min(180, svgWidth - 24));
  const minWidth = Math.min(88, maxWidth);
  const maxChars = Math.max(10, Math.floor((maxWidth - 28) / 6.7));
  const label = truncateText(name, maxChars);
  const width = clamp(label.length * 6.9 + 28, minWidth, maxWidth);
  const preferredRightX = x + 14;
  const placeOnRight = preferredRightX + width <= svgWidth - 12 || x < svgWidth / 2;
  const labelX = placeOnRight
    ? Math.min(preferredRightX, svgWidth - width - 12)
    : Math.max(12, x - width - 14);

  return {
    height: EVENT_TAG_HEIGHT,
    id,
    label,
    dotX: placeOnRight ? labelX - 6 : labelX + width + 6,
    textX: labelX + width / 2,
    width,
    x: labelX,
    y: y - EVENT_TAG_HEIGHT / 2,
  };
}

function getSharedEventX(
  participantPositions: number[],
  personThreadPositions: number[],
  fallbackX: number,
) {
  if (participantPositions.length <= 1) {
    return participantPositions[0] ?? fallbackX;
  }

  const sortedParticipants = [...participantPositions].sort((a, b) => a - b);
  const centroid =
    sortedParticipants.reduce((sum, position) => sum + position, 0) / sortedParticipants.length;
  const spanStart = sortedParticipants[0];
  const spanEnd = sortedParticipants[sortedParticipants.length - 1];
  const sortedThreads = [...personThreadPositions].sort((a, b) => a - b);

  const gapCenters: number[] = [];
  for (let index = 0; index < sortedThreads.length - 1; index += 1) {
    const left = sortedThreads[index];
    const right = sortedThreads[index + 1];
    const gapStart = Math.max(left, spanStart);
    const gapEnd = Math.min(right, spanEnd);

    if (gapEnd - gapStart > 1) {
      gapCenters.push((gapStart + gapEnd) / 2);
    }
  }

  if (gapCenters.length > 0) {
    return gapCenters.reduce((closest, current) =>
      Math.abs(current - centroid) < Math.abs(closest - centroid) ? current : closest,
    );
  }

  const leftNeighbor = [...sortedThreads].reverse().find((threadX) => threadX < centroid);
  const rightNeighbor = sortedThreads.find((threadX) => threadX > centroid);

  if (leftNeighbor !== undefined && rightNeighbor !== undefined) {
    return (leftNeighbor + rightNeighbor) / 2;
  }

  return fallbackX;
}

function resolveHorizontalEventNodeCollisions<
  T extends {
    event: Event;
    x: number;
    y: number;
  },
>(nodes: T[], minX: number, maxX: number) {
  const minimumSeparation = EVENT_NODE_RADIUS * 2 + EVENT_NODE_GAP;
  const resolvedXById = new Map<string, number>();
  const nodesByTimestamp = new Map<number, T[]>();

  for (const node of nodes) {
    const timestampNodes = nodesByTimestamp.get(node.event.timestamp) ?? [];
    timestampNodes.push(node);
    nodesByTimestamp.set(node.event.timestamp, timestampNodes);
  }

  for (const timestampNodes of nodesByTimestamp.values()) {
    const sortedNodes = [...timestampNodes].sort((a, b) => a.x - b.x || a.event.id.localeCompare(b.event.id));

    let clusterStart = 0;
    while (clusterStart < sortedNodes.length) {
      let clusterEnd = clusterStart + 1;
      while (
        clusterEnd < sortedNodes.length &&
        sortedNodes[clusterEnd].x - sortedNodes[clusterEnd - 1].x < minimumSeparation
      ) {
        clusterEnd += 1;
      }

      const cluster = sortedNodes.slice(clusterStart, clusterEnd);
      const clusterWidth = minimumSeparation * (cluster.length - 1);
      const anchorCenter = cluster.reduce((sum, node) => sum + node.x, 0) / cluster.length;
      const unclampedStartX = anchorCenter - clusterWidth / 2;
      const startX = clamp(unclampedStartX, minX, Math.max(minX, maxX - clusterWidth));

      cluster.forEach((node, index) => {
        resolvedXById.set(node.event.id, startX + index * minimumSeparation);
      });

      clusterStart = clusterEnd;
    }
  }

  return nodes.map((node) => ({
    ...node,
    x: resolvedXById.get(node.event.id) ?? node.x,
  }));
}

export function ThreadCanvas({
  people,
  events,
  onEventClick,
}: ThreadCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(1200);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = (width: number) => {
      setCanvasWidth(Math.max(MIN_CANVAS_WIDTH, Math.floor(width)));
    };

    updateWidth(container.clientWidth);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        updateWidth(entry.contentRect.width);
      }
    });

    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  const {
    sideMargin,
    svgWidth,
    threadPositions,
    eventNodes,
    allColumns,
    personColumns,
    eventThreadColumns,
    eventThreadColorById,
    eventThreadTags,
    totalHeight,
    getY,
    gridLines,
    eventThreadRanges,
  } = useMemo(() => {
    const svgWidth = Math.max(MIN_CANVAS_WIDTH, canvasWidth);
    const sideMargin = clamp(svgWidth * 0.08, 52, 100);
    const rightMargin = clamp(svgWidth * 0.14, 96, 150);

    if (people.length === 0 && events.length === 0) {
      return {
        allColumns: [],
        eventNodes: [],
        eventThreadColumns: [],
        eventThreadColorById: new Map<string, string>(),
        eventThreadTags: [],
        eventThreadRanges: new Map<string, { minY: number; maxY: number }>(),
        getY: (_timestamp: number) => 0,
        gridLines: [],
        personColumns: [],
        sideMargin,
        svgWidth,
        threadPositions: new Map<string, number>(),
        totalHeight: 800,
      };
    }

    const timestamps = events.map((e) => e.timestamp);
    const hasEvents = timestamps.length > 0;
    const minTime = hasEvents ? Math.min(...timestamps) : Date.now();
    const maxTime = hasEvents ? Math.max(...timestamps) : Date.now();
    const timeSpanMs = maxTime - minTime;
    const paddingMs = Math.max(7 * msPerDay, timeSpanMs * 0.1);
    const paddedMinMs = minTime - paddingMs;
    const paddedMaxMs = maxTime + paddingMs;
    const totalSpanMs = paddedMaxMs - paddedMinMs;

    let timeScale = 20 / msPerDay;
    let calcHeight = totalSpanMs * timeScale;

    if (calcHeight > 15000) {
      timeScale = 15000 / totalSpanMs;
      calcHeight = 15000;
    } else if (calcHeight < 800) {
      timeScale = 800 / totalSpanMs;
      calcHeight = 800;
    }

    const totalHeight = calcHeight;
    const getY = (timestamp: number) => (paddedMaxMs - timestamp) * timeScale;

    const gridLines: { time: number; label: string }[] = [];
    if (hasEvents) {
      const days = totalSpanMs / msPerDay;
      const minDate = new Date(paddedMinMs);

      if (days <= 60) {
        const start = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
        for (let d = new Date(start); d.getTime() <= paddedMaxMs; d.setDate(d.getDate() + 1)) {
          if (d.getTime() >= paddedMinMs) {
            gridLines.push({
              time: d.getTime(),
              label: d.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              }),
            });
          }
        }
      } else if (days <= 730) {
        const start = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
        for (let d = new Date(start); d.getTime() <= paddedMaxMs; d.setMonth(d.getMonth() + 1)) {
          if (d.getTime() >= paddedMinMs) {
            gridLines.push({
              time: d.getTime(),
              label: d.toLocaleDateString(undefined, {
                month: 'short',
                year: 'numeric',
              }),
            });
          }
        }
      } else {
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
    const eventThreads = new Set(events.map((e) => e.threadId).filter(Boolean) as string[]);
    const columns = [
      ...people.map((p) => ({
        color: p.color,
        id: p.id,
        name: p.name,
        type: 'person' as const,
      })),
      ...Array.from(eventThreads).map((tid) => {
        const threadEvents = events.filter((e) => e.threadId === tid);
        return {
          color: threadEvents[0]?.color || '#64748b',
          id: tid,
          name: tid,
          type: 'eventThread' as const,
        };
      }),
    ];
    const personColumns = columns.filter((col) => col.type === 'person');
    const eventThreadColumns = columns.filter((col) => col.type === 'eventThread');
    const eventThreadColorById = new Map(eventThreadColumns.map((col) => [col.id, col.color]));

    const availableWidth = Math.max(svgWidth - sideMargin - rightMargin, 160);
    const spacing = columns.length > 1 ? availableWidth / (columns.length - 1) : availableWidth / 2;

    columns.forEach((col, index) => {
      positions.set(
        col.id,
        sideMargin + (columns.length === 1 ? availableWidth / 2 : index * spacing),
      );
    });
    const personThreadPositions = personColumns
      .map((col) => positions.get(col.id))
      .filter((position): position is number => position !== undefined);

    const eventThreadRanges = new Map<string, { minY: number; maxY: number }>();
    Array.from(eventThreads).forEach((tid) => {
      const threadEvents = events.filter((e) => e.threadId === tid);
      if (threadEvents.length > 0) {
        const earliestTimestamp = Math.min(...threadEvents.map((e) => e.timestamp));
        const latestTimestamp = Math.max(...threadEvents.map((e) => e.timestamp));
        eventThreadRanges.set(tid, {
          maxY: getY(earliestTimestamp),
          minY: getY(latestTimestamp),
        });
      }
    });

    const eventNodes = events.map((event) => {
      const y = getY(event.timestamp);

      let x: number;
      if (event.threadId && positions.has(event.threadId)) {
        x = positions.get(event.threadId)!;
      } else {
        const personPositions = event.personIds
          .map((pid) => positions.get(pid))
          .filter((position): position is number => position !== undefined);
        x =
          personPositions.length > 0
            ? getSharedEventX(
                personPositions,
                personThreadPositions,
                sideMargin + availableWidth / 2,
              )
            : sideMargin + availableWidth / 2;
      }

      return {
        event,
        x,
        y,
      };
    });

    const positionedEventNodes = resolveHorizontalEventNodeCollisions(
      eventNodes,
      EVENT_NODE_RADIUS + 4,
      svgWidth - EVENT_NODE_RADIUS - 12,
    );
    const eventNodesWithLabels = positionedEventNodes.map((node) => ({
      ...node,
      labelLayout: getEventLabelLayout(
        node.x,
        node.y,
        svgWidth,
        node.event.title,
        node.event.interpretation,
        node.event.timestamp,
        node.event.personIds.length,
      ),
    }));

    const resolvedLabelLayouts = resolveVerticalCollisions(
      eventNodesWithLabels.map(({ event, labelLayout }) => ({
        ...labelLayout,
        id: event.id,
      })),
      EVENT_LABEL_MARGIN,
      totalHeight - EVENT_LABEL_MARGIN,
      EVENT_LABEL_GAP,
    );
    const labelByEventId = new Map(resolvedLabelLayouts.map((layout) => [layout.id, layout]));
    const finalizedEventNodes = eventNodesWithLabels.map((node) => ({
      ...node,
      labelLayout: labelByEventId.get(node.event.id) ?? node.labelLayout,
    }));

    const eventThreadTags = resolveVerticalCollisions(
      eventThreadColumns
        .map((col) => {
          const x = positions.get(col.id);
          const range = eventThreadRanges.get(col.id);
          if (x === undefined || !range) return null;

          const startY = Math.max(20, range.minY - 40);
          return getThreadTagLayout(col.id, x, Math.min(totalHeight - 24, startY + 18), svgWidth, col.name);
        })
        .filter((tag): tag is EventThreadTagLayout => tag !== null),
      12,
      totalHeight - 12,
      EVENT_TAG_GAP,
    );

    return {
      allColumns: columns,
      eventNodes: finalizedEventNodes,
      eventThreadColumns,
      eventThreadColorById,
      eventThreadTags,
      eventThreadRanges,
      getY,
      gridLines,
      personColumns,
      sideMargin,
      svgWidth,
      threadPositions: positions,
      totalHeight,
    };
  }, [canvasWidth, people, events]);

  return (
    <div
      ref={containerRef}
      className="h-full min-h-[420px] w-full overflow-y-auto overflow-x-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-inner"
    >
      <div className="relative flex min-h-full flex-col">
        <div className="sticky top-0 z-20 h-[60px] w-full shrink-0 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-md">
          {personColumns.map((col) => {
            const x = threadPositions.get(col.id);
            if (x === undefined) return null;

            return (
              <div
                key={col.id}
                className="absolute top-0 flex h-full -translate-x-1/2 flex-col items-center justify-center transition-transform"
                style={{ left: x }}
              >
                <div
                  className="mb-1.5 h-3 w-3 shadow-sm"
                  style={{
                    backgroundColor: col.color,
                    borderRadius: '50%',
                  }}
                />
                <span
                  className="whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold text-white shadow-sm"
                  style={{ backgroundColor: col.color }}
                >
                  {col.name}
                </span>
              </div>
            );
          })}
        </div>

        <div className="relative" style={{ height: totalHeight }}>
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${svgWidth} ${totalHeight}`}
            preserveAspectRatio="none"
            className="absolute inset-0"
          >
            {gridLines.map((line, index) => {
              const y = getY(line.time);
              return (
                <g key={`grid-${index}`}>
                  <line
                    x1={Math.max(12, sideMargin - 20)}
                    y1={y}
                    x2={svgWidth - 12}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    strokeDasharray="4,4"
                  />
                  <text
                    x={Math.max(8, sideMargin - 30)}
                    y={y + 4}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize="12"
                    fontWeight="500"
                    className="pointer-events-none select-none"
                  >
                    {line.label}
                  </text>
                </g>
              );
            })}

            {allColumns.map((col) => {
              const x = threadPositions.get(col.id);
              if (x === undefined) return null;

              if (col.type === 'person') {
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
              }

              const range = eventThreadRanges.get(col.id);
              if (!range) return null;

              const startY = Math.max(0, range.minY - 40);
              const endY = Math.min(totalHeight, range.maxY + 40);

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
            })}

            {eventThreadTags.map((tagLayout) => {
              const x = threadPositions.get(tagLayout.id);
              if (x === undefined) return null;
              const tagY = tagLayout.y + tagLayout.height / 2;
              return (
                <g key={`${tagLayout.id}-tag`} className="pointer-events-none select-none">
                  <line
                    x1={x}
                    y1={tagY}
                    x2={tagLayout.dotX}
                    y2={tagY}
                    stroke={eventThreadColorById.get(tagLayout.id) || '#64748b'}
                    strokeWidth="1.5"
                    opacity="0.7"
                  />
                  <circle
                    cx={tagLayout.dotX}
                    cy={tagY}
                    r={3.5}
                    fill={eventThreadColorById.get(tagLayout.id) || '#64748b'}
                    opacity="0.85"
                  />
                  <rect
                    x={tagLayout.x}
                    y={tagLayout.y}
                    width={tagLayout.width}
                    height={tagLayout.height}
                    rx={11}
                    fill="white"
                    fillOpacity="0.96"
                    stroke={eventThreadColorById.get(tagLayout.id) || '#64748b'}
                    strokeWidth="1"
                  />
                  <text
                    x={tagLayout.textX}
                    y={tagY + 4}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="600"
                    fill="#1e293b"
                  >
                    {tagLayout.label}
                  </text>
                </g>
              );
            })}

            {eventNodes.map(({ event, x, y }) =>
              event.personIds.map((personId, personIndex) => {
                const threadX = threadPositions.get(personId);
                if (threadX === undefined) return null;

                const person = people.find((p) => p.id === personId);

                return (
                  <path
                    key={`${event.id}-${personId}`}
                    d={getPersonEventConnectorPath(
                      threadX,
                      x,
                      y,
                      personIndex,
                      event.personIds.length,
                    )}
                    stroke={person?.color || '#64748b'}
                    strokeWidth="2"
                    opacity="0.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                );
              }),
            )}

            {eventNodes.map(({ event, labelLayout, x, y }) => (
              <g
                key={event.id}
                onClick={() => onEventClick?.(event)}
                className="group cursor-pointer"
              >
                <circle
                  cx={x}
                  cy={y}
                  r={8}
                  fill={event.color}
                  stroke="white"
                  strokeWidth="2"
                  style={{
                    filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))',
                  }}
                />
                <circle
                  cx={x}
                  cy={y}
                  r={14}
                  fill="transparent"
                  className="group-hover:fill-black group-hover:fill-opacity-5"
                />

                <line
                  x1={x}
                  y1={y}
                  x2={labelLayout.connectorX}
                  y2={labelLayout.y + labelLayout.height / 2}
                  stroke={event.color}
                  strokeWidth="1.5"
                  opacity="0.35"
                  className="pointer-events-none opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                />

                <g className="pointer-events-none opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <rect
                    x={labelLayout.x}
                    y={labelLayout.y}
                    width={labelLayout.width}
                    height={labelLayout.height}
                    fill="white"
                    fillOpacity="0.95"
                    rx="6"
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    className="transition-all duration-200 group-hover:stroke-slate-300"
                  />

                  <text
                    x={labelLayout.textX}
                    y={labelLayout.y + EVENT_LABEL_VERTICAL_PADDING}
                    fontSize="13"
                    fontWeight="600"
                    fill="#1e293b"
                    className="select-none"
                    dominantBaseline="hanging"
                  >
                    {labelLayout.titleLines.map((line, index) => (
                      <tspan
                        key={`${event.id}-title-${index}`}
                        x={labelLayout.textX}
                        dy={index === 0 ? 0 : EVENT_LABEL_TITLE_LINE_HEIGHT}
                      >
                        {line}
                      </tspan>
                    ))}
                  </text>

                  <text
                    x={labelLayout.textX}
                    y={
                      labelLayout.y +
                      EVENT_LABEL_VERTICAL_PADDING +
                      labelLayout.titleLines.length * EVENT_LABEL_TITLE_LINE_HEIGHT +
                      EVENT_LABEL_SECTION_GAP
                    }
                    fontSize="10"
                    fill="#64748b"
                    className="select-none"
                    dominantBaseline="hanging"
                  >
                    {labelLayout.metaLabel}
                  </text>

                  {labelLayout.interpretationLines.length > 0 && (
                    <text
                      x={labelLayout.textX}
                      y={
                        labelLayout.y +
                        EVENT_LABEL_VERTICAL_PADDING +
                        labelLayout.titleLines.length * EVENT_LABEL_TITLE_LINE_HEIGHT +
                        EVENT_LABEL_SECTION_GAP +
                        EVENT_LABEL_META_LINE_HEIGHT +
                        EVENT_LABEL_SECTION_GAP
                      }
                      fontSize="11"
                      fill="#64748b"
                      fontStyle="italic"
                      className="select-none"
                      dominantBaseline="hanging"
                    >
                      {labelLayout.interpretationLines.map((line, index) => (
                        <tspan
                          key={`${event.id}-interpretation-${index}`}
                          x={labelLayout.textX}
                          dy={index === 0 ? 0 : EVENT_LABEL_META_LINE_HEIGHT}
                        >
                          {line}
                        </tspan>
                      ))}
                    </text>
                  )}
                </g>
              </g>
            ))}

            {events.length === 0 && people.length === 0 && (
              <text
                x="50%"
                y={totalHeight / 2}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="16"
                className="pointer-events-none"
              >
                Add people and events to start building your thread memory
              </text>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}
