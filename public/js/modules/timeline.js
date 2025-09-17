import { Stream } from '../core/stream.js';

const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);

let idCounter = 0;

function normalizeEntry(partial = {}) {
  const id = partial.id ?? `timeline-${Date.now()}-${idCounter += 1}`;
  return {
    id,
    offset: clamp(typeof partial.offset === 'number' ? partial.offset : 0),
    label: partial.label ?? '',
    metadata: partial.metadata ? { ...partial.metadata } : {},
    color: partial.color ?? null
  };
}

function sortEntries(entries) {
  return [...entries].sort((a, b) => a.offset - b.offset);
}

export const timelineEntries = new Stream([]);
export const selectedTimelineEntryId = new Stream(null);

export function setTimelineEntries(entries) {
  const normalized = entries.map(normalizeEntry);
  timelineEntries.set(sortEntries(normalized));
}

export function addTimelineEntry(entry = {}) {
  const normalized = normalizeEntry(entry);
  const next = sortEntries([...timelineEntries.get(), normalized]);
  timelineEntries.set(next);
  selectedTimelineEntryId.set(normalized.id);
  return normalized;
}

export function updateTimelineEntry(id, updates = {}) {
  let updatedEntry = null;
  const next = timelineEntries.get().map(entry => {
    if (entry.id !== id) {
      return entry;
    }

    const nextEntry = {
      ...entry,
      ...updates,
      metadata: updates.metadata
        ? { ...(entry.metadata ?? {}), ...updates.metadata }
        : (entry.metadata ? { ...entry.metadata } : {}),
    };

    if (typeof nextEntry.offset === 'number') {
      nextEntry.offset = clamp(nextEntry.offset);
    }

    updatedEntry = nextEntry;
    return nextEntry;
  });

  if (!updatedEntry) {
    return null;
  }

  const sorted = sortEntries(next);
  timelineEntries.set(sorted);
  return updatedEntry;
}

export function removeTimelineEntry(id) {
  const filtered = timelineEntries.get().filter(entry => entry.id !== id);
  timelineEntries.set(filtered);
  if (selectedTimelineEntryId.get() === id) {
    selectedTimelineEntryId.set(filtered[0]?.id ?? null);
  }
}

export function selectTimelineEntry(id) {
  selectedTimelineEntryId.set(id ?? null);
}

export function getTimelineEntry(id) {
  return timelineEntries.get().find(entry => entry.id === id) ?? null;
}

export function clearTimelineEntries() {
  timelineEntries.set([]);
  selectedTimelineEntryId.set(null);
}

export function spaceTimelineEntriesEvenly() {
  const sortedEntries = sortEntries(timelineEntries.get());
  const count = sortedEntries.length;
  const denominator = Math.max(count - 1, 1);

  const spacedEntries = sortedEntries.map((entry, index) => ({
    ...entry,
    offset: index / denominator
  }));

  timelineEntries.set(spacedEntries);

  return spacedEntries;
}
