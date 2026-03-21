import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Person, Event } from '../types/thread-memories';
import { formatDateTimeValue } from '../utils/date-format';

interface ThreadCanvasProps {
  people: Person[];
  events: Event[];
  onEventClick?: (event: Event) => void;
  focusRequest?: {
    eventId: string;
    requestId: number;
  } | null;
}

const msPerDay = 24 * 60 * 60 * 1000;
const msPerHour = 60 * 60 * 1000;
const approximateMsPerMonth = 30.44 * msPerDay;
const approximateMsPerYear = 365.25 * msPerDay;
const TIMELINE_FLOOR_MS = new Date(1900, 0, 1).getTime();
const MIN_FUTURE_BUFFER_MS = 10 * approximateMsPerYear;
const FUTURE_BUFFER_RATIO = 0.15;
const MIN_CANVAS_WIDTH = 280;
const INITIAL_VERTICAL_ZOOM = 8.92;
const MIN_VERTICAL_ZOOM = 0.5;
const MAX_VERTICAL_ZOOM = 320;
const ZOOM_STEP = 1.2;
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
const EVENT_TAG_VIEWPORT_PADDING = 14;
const EVENT_TAG_THREAD_OFFSET = 18;
const GRID_RENDER_BUFFER = 240;
const EVENT_FOCUS_ZOOM_PERCENT = 1281;
const EVENT_FOCUS_ZOOM = (INITIAL_VERTICAL_ZOOM * EVENT_FOCUS_ZOOM_PERCENT) / 100;

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

type GridLineLevel = 'year' | 'month' | 'day' | 'hour';
const GRID_LABEL_PART_ORDER: GridLineLevel[] = ['hour', 'day', 'month', 'year'];

interface GridLine {
  label: string;
  level: GridLineLevel;
  time: number;
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

function getStartOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getStartOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getStartOfYear(date: Date) {
  return new Date(date.getFullYear(), 0, 1);
}

function getStartOfHour(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours());
}

function getHourStep(pixelsPerHour: number) {
  if (pixelsPerHour >= 32) return 1;
  if (pixelsPerHour * 3 >= 28) return 3;
  if (pixelsPerHour * 6 >= 22) return 6;
  if (pixelsPerHour * 12 >= 18) return 12;
  return null;
}

function getGridLineStyle(level: GridLineLevel) {
  switch (level) {
    case 'year':
      return {
        fontSize: 12,
        fontWeight: 600,
        stroke: '#cbd5e1',
        strokeDasharray: undefined,
        textFill: '#475569',
      };
    case 'month':
      return {
        fontSize: 11,
        fontWeight: 600,
        stroke: '#dbeafe',
        strokeDasharray: '6,4',
        textFill: '#64748b',
      };
    case 'day':
      return {
        fontSize: 10,
        fontWeight: 500,
        stroke: '#e2e8f0',
        strokeDasharray: '4,4',
        textFill: '#94a3b8',
      };
    case 'hour':
      return {
        fontSize: 10,
        fontWeight: 500,
        stroke: '#f1f5f9',
        strokeDasharray: '2,6',
        textFill: '#94a3b8',
      };
  }
}

function getGridLinePriority(level: GridLineLevel) {
  switch (level) {
    case 'year':
      return 0;
    case 'month':
      return 1;
    case 'day':
      return 2;
    case 'hour':
      return 3;
  }
}

function formatGridLabelPart(level: GridLineLevel, date: Date) {
  switch (level) {
    case 'year':
      return date.getFullYear().toString();
    case 'month':
      return date.toLocaleDateString(undefined, { month: 'short' });
    case 'day':
      return date.getDate().toString();
    case 'hour':
      return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
}

function mergeGridLines(lines: GridLine[]) {
  const grouped = new Map<number, Map<GridLineLevel, string>>();

  for (const line of lines) {
    const parts = grouped.get(line.time) ?? new Map<GridLineLevel, string>();
    parts.set(line.level, line.label);
    grouped.set(line.time, parts);
  }

  return Array.from(grouped.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([time, parts]) => {
      const levels = Array.from(parts.keys());
      const level = levels.reduce((dominant, current) =>
        getGridLinePriority(current) < getGridLinePriority(dominant) ? current : dominant,
      );
      const label = GRID_LABEL_PART_ORDER.filter((partLevel) => parts.has(partLevel))
        .map((partLevel) => parts.get(partLevel))
        .join(', ');

      return {
        label,
        level,
        time,
      };
    });
}

function getDisplayedZoomPercent(zoom: number) {
  return Math.max(1, Math.round((zoom / INITIAL_VERTICAL_ZOOM) * 100));
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
  const dateLabel = formatDateTimeValue(new Date(timestamp));
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

function getClosestAvailableThreadX(
  targetX: number,
  occupiedPositions: number[],
  minX: number,
  maxX: number,
  minimumGap: number,
) {
  const clampedTarget = clamp(targetX, minX, maxX);
  const candidatePositions = new Set<number>([clampedTarget, minX, maxX]);

  for (const occupiedX of occupiedPositions) {
    candidatePositions.add(clamp(occupiedX - minimumGap, minX, maxX));
    candidatePositions.add(clamp(occupiedX + minimumGap, minX, maxX));
  }

  const candidates = Array.from(candidatePositions).sort((left, right) => {
    const distanceDifference = Math.abs(left - clampedTarget) - Math.abs(right - clampedTarget);
    if (Math.abs(distanceDifference) > 0.001) {
      return distanceDifference;
    }

    return left - right;
  });

  const resolvedCandidate = candidates.find((candidate) =>
    occupiedPositions.every((occupiedX) => Math.abs(candidate - occupiedX) >= minimumGap - 0.001),
  );

  if (resolvedCandidate !== undefined) {
    return resolvedCandidate;
  }

  return candidates.reduce((bestCandidate, candidate) => {
    const bestDistance = Math.min(
      ...occupiedPositions.map((occupiedX) => Math.abs(bestCandidate - occupiedX)),
    );
    const candidateDistance = Math.min(
      ...occupiedPositions.map((occupiedX) => Math.abs(candidate - occupiedX)),
    );

    if (Math.abs(candidateDistance - bestDistance) > 0.001) {
      return candidateDistance > bestDistance ? candidate : bestCandidate;
    }

    return Math.abs(candidate - clampedTarget) < Math.abs(bestCandidate - clampedTarget)
      ? candidate
      : bestCandidate;
  }, candidates[0] ?? clampedTarget);
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
  focusRequest,
}: ThreadCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pendingZoomAnchorRef = useRef<{
    anchorOffset: number;
    anchorRatio: number;
    zoom: number;
  } | null>(null);
  const handledFocusRequestIdRef = useRef<number | null>(null);
  const hasInitializedViewportRef = useRef(false);
  const [presentAnchorTime] = useState(() => Date.now());
  const [canvasWidth, setCanvasWidth] = useState(1200);
  const [verticalZoom, setVerticalZoom] = useState(INITIAL_VERTICAL_ZOOM);
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [pendingFocusRequest, setPendingFocusRequest] = useState<{
    eventId: string;
    requestId: number;
  } | null>(null);
  const [viewportMetrics, setViewportMetrics] = useState({
    height: 0,
    scrollTop: 0,
  });
  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const hoveredEvent = useMemo(
    () => events.find((event) => event.id === hoveredEventId) ?? null,
    [events, hoveredEventId],
  );
  const highlightedPersonIds = useMemo(
    () => new Set(hoveredEvent?.personIds ?? []),
    [hoveredEvent],
  );
  const hasHoveredEvent = hoveredEvent !== null;

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

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const pendingZoomAnchor = pendingZoomAnchorRef.current;
    if (!viewport || !pendingZoomAnchor || pendingZoomAnchor.zoom !== verticalZoom) {
      return;
    }

    const nextScrollHeight = Math.max(1, viewport.scrollHeight);
    const maxScrollTop = Math.max(0, nextScrollHeight - viewport.clientHeight);
    const nextScrollTop = pendingZoomAnchor.anchorRatio * nextScrollHeight - pendingZoomAnchor.anchorOffset;

    viewport.scrollTop = clamp(nextScrollTop, 0, maxScrollTop);
    pendingZoomAnchorRef.current = null;
  }, [verticalZoom]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateViewportMetrics = () => {
      setViewportMetrics((current) => {
        const next = {
          height: viewport.clientHeight,
          scrollTop: viewport.scrollTop,
        };

        if (current.height === next.height && current.scrollTop === next.scrollTop) {
          return current;
        }

        return next;
      });
    };

    updateViewportMetrics();

    viewport.addEventListener('scroll', updateViewportMetrics, { passive: true });

    const observer = new ResizeObserver(() => {
      updateViewportMetrics();
    });

    observer.observe(viewport);

    return () => {
      viewport.removeEventListener('scroll', updateViewportMetrics);
      observer.disconnect();
    };
  }, []);

  const setAnchoredVerticalZoom = (nextZoom: number, anchorClientY?: number) => {
    const clampedZoom = clamp(Number(nextZoom.toFixed(3)), MIN_VERTICAL_ZOOM, MAX_VERTICAL_ZOOM);
    if (clampedZoom === verticalZoom) {
      return;
    }

    const viewport = viewportRef.current;
    if (!viewport) {
      setVerticalZoom(clampedZoom);
      return;
    }

    const rect = viewport.getBoundingClientRect();
    const anchorOffset =
      anchorClientY === undefined
        ? viewport.clientHeight / 2
        : clamp(anchorClientY - rect.top, 0, viewport.clientHeight);
    const currentScrollHeight = Math.max(1, viewport.scrollHeight);
    const anchorPosition = viewport.scrollTop + anchorOffset;

    pendingZoomAnchorRef.current = {
      anchorOffset,
      anchorRatio: anchorPosition / currentScrollHeight,
      zoom: clampedZoom,
    };
    setVerticalZoom(clampedZoom);
  };

  useEffect(() => {
    if (!focusRequest || handledFocusRequestIdRef.current === focusRequest.requestId) {
      return;
    }

    const requestedEvent = events.find((event) => event.id === focusRequest.eventId);
    if (!requestedEvent) {
      handledFocusRequestIdRef.current = focusRequest.requestId;
      setPendingFocusRequest(null);
      return;
    }

    handledFocusRequestIdRef.current = focusRequest.requestId;
    setPendingFocusRequest({
      eventId: requestedEvent.id,
      requestId: focusRequest.requestId,
    });

    if (Math.abs(verticalZoom - EVENT_FOCUS_ZOOM) > 0.001) {
      setAnchoredVerticalZoom(EVENT_FOCUS_ZOOM);
    }
  }, [events, focusRequest, verticalZoom]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleViewportWheel = (event: WheelEvent) => {
      if (!(event.ctrlKey || event.metaKey)) {
        return;
      }

      event.preventDefault();

      const zoomFactor = Math.exp(-event.deltaY * 0.0015);
      setAnchoredVerticalZoom(verticalZoom * zoomFactor, event.clientY);
    };

    viewport.addEventListener('wheel', handleViewportWheel, { passive: false });

    return () => {
      viewport.removeEventListener('wheel', handleViewportWheel);
    };
  }, [verticalZoom]);

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
    presentY,
    scrollRangeEnd,
    scrollRangeStart,
  } = useMemo(() => {
    const svgWidth = Math.max(MIN_CANVAS_WIDTH, canvasWidth);
    const sideMargin = clamp(svgWidth * 0.08, 52, 100);
    const rightMargin = clamp(svgWidth * 0.14, 96, 150);

    const timestamps = events.map((e) => e.timestamp);
    const hasEvents = timestamps.length > 0;
    const minTime = hasEvents ? Math.min(...timestamps) : presentAnchorTime;
    const maxTime = hasEvents ? Math.max(...timestamps) : presentAnchorTime;
    const timeSpanMs = maxTime - minTime;
    const paddingMs = Math.max(7 * msPerDay, timeSpanMs * 0.1);
    const paddedMinMs = Math.min(TIMELINE_FLOOR_MS, minTime - paddingMs);
    const upperAnchorMs = Math.max(maxTime, presentAnchorTime);
    const futureBufferMs = Math.max(
      paddingMs,
      MIN_FUTURE_BUFFER_MS,
      (upperAnchorMs - paddedMinMs) * FUTURE_BUFFER_RATIO,
    );
    const paddedMaxMs = upperAnchorMs + futureBufferMs;
    const totalSpanMs = Math.max(msPerDay, paddedMaxMs - paddedMinMs);

    let timeScale = 20 / msPerDay;
    let calcHeight = totalSpanMs * timeScale;

    if (calcHeight > 15000) {
      timeScale = 15000 / totalSpanMs;
      calcHeight = 15000;
    } else if (calcHeight < 800) {
      timeScale = 800 / totalSpanMs;
      calcHeight = 800;
    }

    const totalHeight = calcHeight * verticalZoom;
    const scaledTimeScale = timeScale * verticalZoom;
    const getY = (timestamp: number) => (paddedMaxMs - timestamp) * scaledTimeScale;
    const presentY = getY(presentAnchorTime);
    const viewportHeight = Math.max(420, viewportMetrics.height || 0);
    const maxScrollTop = Math.max(0, totalHeight - viewportHeight);
    const latestRelevantY = hasEvents ? getY(maxTime) : presentY;
    const earliestRelevantY = hasEvents ? getY(minTime) : presentY;
    const scrollRangeStart = clamp(latestRelevantY - viewportHeight / 2, 0, maxScrollTop);
    const scrollRangeEnd = clamp(earliestRelevantY - viewportHeight / 2, 0, maxScrollTop);

    const rawGridLines: GridLine[] = [];
    const visibleTop = Math.max(0, viewportMetrics.scrollTop - GRID_RENDER_BUFFER);
    const visibleBottom = Math.min(
      totalHeight,
      viewportMetrics.scrollTop + viewportHeight + GRID_RENDER_BUFFER,
    );
    const visibleMaxMs = paddedMaxMs - visibleTop / scaledTimeScale;
    const visibleMinMs = paddedMaxMs - visibleBottom / scaledTimeScale;
    const pixelsPerYear = scaledTimeScale * approximateMsPerYear;
    const pixelsPerMonth = scaledTimeScale * approximateMsPerMonth;
    const pixelsPerDay = scaledTimeScale * msPerDay;
    const pixelsPerHour = scaledTimeScale * msPerHour;

    const yearStep = pixelsPerYear >= 28 ? 1 : pixelsPerYear >= 14 ? 2 : 5;
    const showMonths = pixelsPerMonth >= 20;
    const showDays = pixelsPerDay >= 12;
    const hourStep = getHourStep(pixelsPerHour);

    const yearStart = getStartOfYear(new Date(visibleMinMs));
    const yearOffset = yearStart.getFullYear() % yearStep;
    if (yearOffset !== 0) {
      yearStart.setFullYear(yearStart.getFullYear() + (yearStep - yearOffset));
    }

    for (
      let current = new Date(yearStart);
      current.getTime() <= visibleMaxMs;
      current.setFullYear(current.getFullYear() + yearStep)
    ) {
      if (current.getTime() >= paddedMinMs) {
        rawGridLines.push({
          label: formatGridLabelPart('year', current),
          level: 'year',
          time: current.getTime(),
        });
      }
    }

    if (showMonths) {
      const start = getStartOfMonth(new Date(visibleMinMs));
      for (
        let current = new Date(start);
        current.getTime() <= visibleMaxMs;
        current.setMonth(current.getMonth() + 1)
      ) {
        if (current.getTime() >= paddedMinMs) {
          rawGridLines.push({
            label: formatGridLabelPart('month', current),
            level: 'month',
            time: current.getTime(),
          });
        }
      }
    }

    if (showDays) {
      const start = getStartOfDay(new Date(visibleMinMs));
      for (
        let current = new Date(start);
        current.getTime() <= visibleMaxMs;
        current.setDate(current.getDate() + 1)
      ) {
        if (current.getTime() >= paddedMinMs) {
          rawGridLines.push({
            label: formatGridLabelPart('day', current),
            level: 'day',
            time: current.getTime(),
          });
        }
      }
    }

    if (hourStep) {
      const start = getStartOfHour(new Date(visibleMinMs));
      const remainder = start.getHours() % hourStep;
      if (remainder !== 0) {
        start.setHours(start.getHours() + (hourStep - remainder));
      }

      for (
        let current = new Date(start);
        current.getTime() <= visibleMaxMs;
        current.setHours(current.getHours() + hourStep)
      ) {
        if (current.getTime() >= paddedMinMs) {
          rawGridLines.push({
            label: formatGridLabelPart('hour', current),
            level: 'hour',
            time: current.getTime(),
          });
        }
      }
    }

    const gridLines = mergeGridLines(rawGridLines);
    const positions = new Map<string, number>();
    const eventThreads = Array.from(
      new Set(events.map((event) => event.threadId).filter(Boolean) as string[]),
    );
    const threadEventsById = new Map(
      eventThreads.map((threadId) => [
        threadId,
        events.filter((event) => event.threadId === threadId),
      ]),
    );
    const personColumns = people.map((person) => ({
      color: person.color,
      id: person.id,
      name: person.name,
      type: 'person' as const,
    }));
    const eventThreadColumns = eventThreads.map((threadId) => {
      const threadEvents = threadEventsById.get(threadId) ?? [];
      return {
        color: threadEvents[0]?.color || '#64748b',
        id: threadId,
        name: threadId,
        type: 'eventThread' as const,
      };
    });
    const columns = [...personColumns, ...eventThreadColumns];
    const eventThreadColorById = new Map(eventThreadColumns.map((col) => [col.id, col.color]));

    const availableWidth = Math.max(svgWidth - sideMargin - rightMargin, 160);
    const minThreadX = sideMargin;
    const maxThreadX = sideMargin + availableWidth;
    const personSpacing =
      personColumns.length > 1 ? availableWidth / (personColumns.length - 1) : availableWidth / 2;

    personColumns.forEach((col, index) => {
      positions.set(
        col.id,
        sideMargin + (personColumns.length === 1 ? availableWidth / 2 : index * personSpacing),
      );
    });
    const personThreadPositions = personColumns
      .map((col) => positions.get(col.id))
      .filter((position): position is number => position !== undefined);
    const threadSeparation =
      columns.length > 1
        ? clamp((availableWidth / (columns.length - 1)) * 0.45, 18, 52)
        : 24;

    const resolvedEventThreadPositions = eventThreadColumns
      .map((col) => {
        const threadEvents = threadEventsById.get(col.id) ?? [];
        const linkedPersonPositions = threadEvents.flatMap((event) =>
          event.personIds
            .map((personId) => positions.get(personId))
            .filter((position): position is number => position !== undefined),
        );
        const targetX =
          linkedPersonPositions.length > 0
            ? getSharedEventX(
                linkedPersonPositions,
                personThreadPositions,
                sideMargin + availableWidth / 2,
              )
            : sideMargin + availableWidth / 2;

        return {
          id: col.id,
          targetX,
        };
      })
      .sort((left, right) => left.targetX - right.targetX || left.id.localeCompare(right.id));
    const occupiedThreadPositions = [...personThreadPositions];

    resolvedEventThreadPositions.forEach(({ id, targetX }) => {
      const resolvedX = getClosestAvailableThreadX(
        targetX,
        occupiedThreadPositions,
        minThreadX,
        maxThreadX,
        threadSeparation,
      );
      positions.set(id, resolvedX);
      occupiedThreadPositions.push(resolvedX);
    });

    const eventThreadRanges = new Map<string, { minY: number; maxY: number }>();
    eventThreads.forEach((tid) => {
      const threadEvents = threadEventsById.get(tid) ?? [];
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

    const visibleTagMinY = clamp(viewportMetrics.scrollTop + EVENT_TAG_VIEWPORT_PADDING, 0, totalHeight);
    const visibleTagMaxY = clamp(
      viewportMetrics.scrollTop + viewportHeight - EVENT_TAG_VIEWPORT_PADDING,
      visibleTagMinY,
      totalHeight,
    );
    const eventThreadTags = resolveVerticalCollisions(
      eventThreadColumns
        .map((col) => {
          const x = positions.get(col.id);
          const range = eventThreadRanges.get(col.id);
          if (x === undefined || !range) return null;

          const threadVisibleTop = Math.max(range.minY, viewportMetrics.scrollTop);
          const threadVisibleBottom = Math.min(
            range.maxY,
            viewportMetrics.scrollTop + viewportHeight,
          );
          if (threadVisibleTop > threadVisibleBottom) {
            return null;
          }

          const preferredCenterY = clamp(
            range.minY + EVENT_TAG_THREAD_OFFSET,
            visibleTagMinY + EVENT_TAG_HEIGHT / 2,
            Math.max(visibleTagMinY + EVENT_TAG_HEIGHT / 2, visibleTagMaxY - EVENT_TAG_HEIGHT / 2),
          );

          return getThreadTagLayout(col.id, x, preferredCenterY, svgWidth, col.name);
        })
        .filter((tag): tag is EventThreadTagLayout => tag !== null),
      visibleTagMinY,
      visibleTagMaxY,
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
      presentY,
      scrollRangeEnd,
      scrollRangeStart,
      sideMargin,
      svgWidth,
      threadPositions: positions,
      totalHeight,
    };
  }, [canvasWidth, people, events, presentAnchorTime, verticalZoom, viewportMetrics]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || hasInitializedViewportRef.current || viewport.clientHeight === 0) {
      return;
    }

    viewport.scrollTop = clamp(presentY - viewport.clientHeight / 2, scrollRangeStart, scrollRangeEnd);
    hasInitializedViewportRef.current = true;
  }, [presentY, scrollRangeEnd, scrollRangeStart]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || viewport.clientHeight === 0) {
      return;
    }

    const clampedScrollTop = clamp(viewport.scrollTop, scrollRangeStart, scrollRangeEnd);
    if (Math.abs(clampedScrollTop - viewport.scrollTop) > 0.5) {
      viewport.scrollTop = clampedScrollTop;
    }
  }, [scrollRangeEnd, scrollRangeStart]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!pendingFocusRequest || !viewport || viewport.clientHeight === 0) {
      return;
    }

    if (Math.abs(verticalZoom - EVENT_FOCUS_ZOOM) > 0.001) {
      return;
    }

    const targetNode = eventNodes.find(({ event }) => event.id === pendingFocusRequest.eventId);
    if (!targetNode) {
      setPendingFocusRequest(null);
      return;
    }

    const centeredScrollTop = clamp(
      targetNode.y - viewport.clientHeight / 2,
      scrollRangeStart,
      scrollRangeEnd,
    );

    if (Math.abs(centeredScrollTop - viewport.scrollTop) > 0.5) {
      viewport.scrollTop = centeredScrollTop;
    }

    setPendingFocusRequest((currentRequest) =>
      currentRequest?.requestId === pendingFocusRequest.requestId ? null : currentRequest,
    );
  }, [eventNodes, pendingFocusRequest, scrollRangeEnd, scrollRangeStart, verticalZoom]);

  return (
    <div
      ref={containerRef}
      className="flex h-full min-h-[420px] w-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-inner"
    >
      <div className="relative z-20 h-[60px] w-full shrink-0 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-md">
        {personColumns.map((col) => {
          const x = threadPositions.get(col.id);
          if (x === undefined) return null;
          const isHighlighted = highlightedPersonIds.has(col.id);

          return (
            <div
              key={col.id}
              className="absolute top-0 flex h-full -translate-x-1/2 flex-col items-center justify-center transition-all"
              style={{
                left: x,
                opacity: hasHoveredEvent ? (isHighlighted ? 1 : 0.45) : 1,
                transform: `translateX(-50%) scale(${hasHoveredEvent && isHighlighted ? 1.04 : 1})`,
              }}
            >
              <div
                className="mb-1.5 h-3 w-3 shadow-sm"
                style={{
                  backgroundColor: col.color,
                  borderRadius: '50%',
                  boxShadow:
                    hasHoveredEvent && isHighlighted
                      ? `0 0 0 4px ${col.color}22, 0 4px 10px ${col.color}33`
                      : undefined,
                }}
              />
              <span
                className="whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold text-white shadow-sm"
                style={{
                  backgroundColor: col.color,
                  boxShadow:
                    hasHoveredEvent && isHighlighted
                      ? `0 0 0 2px white, 0 8px 18px ${col.color}33`
                      : undefined,
                }}
              >
                {col.name}
              </span>
            </div>
          );
        })}
      </div>

      <div
        ref={viewportRef}
        className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
      >
        <div className="sticky top-3 z-20 ml-auto mr-3 mt-3 flex h-0 w-fit justify-end">
          <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white/95 px-2 py-1 text-xs font-medium text-slate-600 shadow-sm backdrop-blur-md">
            <button
              type="button"
              onClick={() => setAnchoredVerticalZoom(verticalZoom / ZOOM_STEP)}
              disabled={verticalZoom <= MIN_VERTICAL_ZOOM}
              className="flex h-7 w-7 items-center justify-center rounded-full text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Zoom out timeline vertically"
              title="Zoom out"
            >
              -
            </button>
            <button
              type="button"
              onClick={() => setAnchoredVerticalZoom(INITIAL_VERTICAL_ZOOM)}
              disabled={Math.abs(verticalZoom - INITIAL_VERTICAL_ZOOM) < 0.001}
              className="rounded-full px-2 py-1 text-[11px] text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Reset timeline vertical zoom"
              title="Reset zoom"
            >
              {getDisplayedZoomPercent(verticalZoom)}%
            </button>
            <button
              type="button"
              onClick={() => setAnchoredVerticalZoom(verticalZoom * ZOOM_STEP)}
              disabled={verticalZoom >= MAX_VERTICAL_ZOOM}
              className="flex h-7 w-7 items-center justify-center rounded-full text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Zoom in timeline vertically"
              title="Zoom in"
            >
              +
            </button>
          </div>
        </div>

        <div className="relative" style={{ height: totalHeight }}>
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${svgWidth} ${totalHeight}`}
            preserveAspectRatio="none"
            className="absolute inset-0"
          >
            {gridLines.map((line) => {
              const y = getY(line.time);
              const style = getGridLineStyle(line.level);
              return (
                <g key={`grid-${line.level}-${line.time}`}>
                  <line
                    x1={Math.max(12, sideMargin - 20)}
                    y1={y}
                    x2={svgWidth - 12}
                    y2={y}
                    stroke={style.stroke}
                    strokeWidth="1"
                    strokeDasharray={style.strokeDasharray}
                  />
                  <text
                    x={Math.max(18, sideMargin - 6)}
                    y={y + 4}
                    textAnchor="start"
                    fill={style.textFill}
                    fontSize={style.fontSize}
                    fontWeight={style.fontWeight}
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
                const isHighlighted = highlightedPersonIds.has(col.id);
                return (
                  <line
                    key={col.id}
                    x1={x}
                    y1={0}
                    x2={x}
                    y2={totalHeight}
                    stroke={col.color}
                    strokeWidth={hasHoveredEvent && isHighlighted ? 3 : 2}
                    opacity={hasHoveredEvent ? (isHighlighted ? 0.9 : 0.14) : 0.3}
                    style={{
                      transition: 'opacity 180ms ease, stroke-width 180ms ease',
                    }}
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

                const person = peopleById.get(personId);
                const isHighlighted = hoveredEventId === event.id;

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
                    strokeWidth={isHighlighted ? 3 : hasHoveredEvent ? 1.5 : 2}
                    opacity={hasHoveredEvent ? (isHighlighted ? 0.95 : 0.12) : 0.5}
                    fill="none"
                    strokeLinecap="round"
                    style={{
                      transition: 'opacity 180ms ease, stroke-width 180ms ease',
                    }}
                  />
                );
              }),
            )}

            {eventNodes.map(({ event, labelLayout, x, y }) => (
              <g
                key={event.id}
                onClick={() => onEventClick?.(event)}
                onMouseEnter={() => setHoveredEventId(event.id)}
                onMouseLeave={() => setHoveredEventId((current) => (current === event.id ? null : current))}
                className="group cursor-pointer"
              >
                <circle
                  cx={x}
                  cy={y}
                  r={8}
                  fill={event.color}
                  stroke="white"
                  strokeWidth={hoveredEventId === event.id ? 2.5 : 2}
                  style={{
                    filter:
                      hoveredEventId === event.id
                        ? `drop-shadow(0px 0px 0px ${event.color}) drop-shadow(0px 4px 10px ${event.color}55)`
                        : 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))',
                    transition: 'stroke-width 180ms ease, filter 180ms ease',
                  }}
                />
                <circle
                  cx={x}
                  cy={y}
                  r={hoveredEventId === event.id ? 18 : 14}
                  fill={hoveredEventId === event.id ? event.color : 'transparent'}
                  fillOpacity={hoveredEventId === event.id ? 0.12 : undefined}
                  style={{
                    transition: 'r 180ms ease, fill-opacity 180ms ease',
                  }}
                  className={hoveredEventId === event.id ? undefined : 'group-hover:fill-black group-hover:fill-opacity-5'}
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
                y={presentY}
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
