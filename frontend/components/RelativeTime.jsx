'use client';

import { useEffect, useMemo, useState } from 'react';

export default function RelativeTime({ value }) {
  const [nowMs, setNowMs] = useState(null);

  useEffect(() => {
    const tick = () => setNowMs(Date.now());
    tick();
    const intervalId = setInterval(tick, 60000);
    return () => clearInterval(intervalId);
  }, []);

  const date = useMemo(() => {
    if (!value) return null;
    const next = new Date(value);
    return Number.isNaN(next.getTime()) ? null : next;
  }, [value]);

  if (!date) return null;

  const diffMs = Math.max(0, (nowMs ?? date.getTime()) - date.getTime());
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
