'use client';

export default function RelativeTime({ value }) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const diffMs = Date.now() - date.getTime();
  const sec = Math.max(1, Math.floor(diffMs / 1000));
  const min = Math.floor(sec / 60);
  const hour = Math.floor(min / 60);
  const day = Math.floor(hour / 24);

  let text = 'just now';
  if (day > 0) text = `${day} day${day > 1 ? 's' : ''} ago`;
  else if (hour > 0) text = `${hour} hour${hour > 1 ? 's' : ''} ago`;
  else if (min > 0) text = `${min} minute${min > 1 ? 's' : ''} ago`;

  return <span>{text}</span>;
}
