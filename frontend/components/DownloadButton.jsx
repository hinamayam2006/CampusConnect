'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { downloadNote } from '../lib/apiRequests';
import FileTypeBadge from './FileTypeBadge';
import { formatFileSize } from '../lib/uiHelpers';

export default function DownloadButton({
  noteId,
  fileUrl,
  downloadUrl,
  fileName,
  fileType,
  fileSize,
  onDownloaded,
}) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (!noteId) return;
    setLoading(true);
    try {
      const res = await downloadNote(noteId);
      if (onDownloaded) onDownloaded();
      const proxyPath = res?.data?.downloadProxyPath || `/notes/${noteId}/file`;
      const downloadName = res?.data?.downloadFileName || fileName || 'note-file';

      // Always use proxy endpoint to preserve content-type headers.
      const fileRes = await api.get(proxyPath, { responseType: 'blob' });
      const blob = fileRes.data;
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = downloadName;
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      const msg = err?.message || 'Could not download note';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        className="btn btn-primary w-100"
        onClick={handleDownload}
        disabled={loading || !noteId}
      >
        {loading ? 'Downloading…' : 'Download'}
      </button>
      <div className="d-flex justify-content-between align-items-center mt-2 text-secondary small">
        <FileTypeBadge fileType={fileType} fileName={fileName} />
        <span>{formatFileSize(fileSize)}</span>
      </div>
    </div>
  );
}
