import { TimestampLike } from '../types/post';

export function resolvePostDate(timestamp: TimestampLike): Date | null {
  if (!timestamp) {
    return null;
  }

  if (timestamp instanceof Date) {
    return timestamp;
  }

  if (typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }

  return null;
}

export default function timeAgo(timestamp: TimestampLike): string {
  const date = resolvePostDate(timestamp);

  if (!date) {
    return 'Just now';
  }

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) {
    return 'Just now';
  }

  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ago`;
  }

  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)}h ago`;
  }

  if (seconds < 604800) {
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatPostDate(timestamp: TimestampLike): string {
  const date = resolvePostDate(timestamp);

  if (!date) {
    return 'Just now';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
