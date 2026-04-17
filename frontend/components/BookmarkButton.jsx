'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { addNoteBookmark, removeNoteBookmark } from '../lib/apiRequests';

export default function BookmarkButton({ noteId, initialBookmarked = false, onChange }) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [saving, setSaving] = useState(false);

  const toggleBookmark = async () => {
    if (!noteId || saving) return;
    const next = !bookmarked;
    setBookmarked(next);
    setSaving(true);
    try {
      if (next) {
        await addNoteBookmark(noteId);
      } else {
        await removeNoteBookmark(noteId);
      }
      if (onChange) onChange(next);
    } catch (err) {
      setBookmarked(!next);
      const msg = err?.message || 'Could not update bookmark';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      type="button"
      className={`btn btn-${bookmarked ? 'secondary' : 'outline-secondary'}`}
      onClick={toggleBookmark}
      disabled={saving}
    >
      {bookmarked ? 'Saved' : 'Save'}
    </button>
  );
}
