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
  additionalFiles = [],
}) {
  const [loading, setLoading] = useState(false);

  const downloadSingleFile = async (url, name) => {
    const fileRes = await fetch(url);
    const blob = await fileRes.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = name;
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Delay revoke slightly to ensure browser processes the download
    await new Promise((resolve) => setTimeout(resolve, 300));
    URL.revokeObjectURL(blobUrl);
  };

  const handleDownload = async () => {
    if (!noteId) return;
    setLoading(true);
    try {
      // Trigger API to increment count & check access
      const res = await downloadNote(noteId);
      if (onDownloaded) onDownloaded();
      
      const filesToDownload = [];
      
      // Add primary file
      const primaryUrl = downloadUrl || fileUrl;
      const primaryName = fileName || 'note-file';
      if (primaryUrl) {
        filesToDownload.push({ url: primaryUrl, name: primaryName });
      }

      // Add additional files
      if (additionalFiles && additionalFiles.length > 0) {
        additionalFiles.forEach(file => {
          const url = file.downloadUrl || file.fileUrl;
          const name = file.fileName || 'attachment';
          if (url) {
            filesToDownload.push({ url, name });
          }
        });
      }

      if (filesToDownload.length > 0) {
        // Download files sequentially with a gap so browsers don't block them
        for (let i = 0; i < filesToDownload.length; i++) {
          if (i > 0) await new Promise((resolve) => setTimeout(resolve, 800));
          await downloadSingleFile(filesToDownload[i].url, filesToDownload[i].name);
        }
      } else {
        // Fallback to proxy path for the main file if no direct URL is available
        const proxyPath = res?.data?.downloadProxyPath || `/notes/${noteId}/file`;
        const fileRes = await api.get(proxyPath, { responseType: 'blob' });
        const blob = fileRes.data;
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = primaryName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }
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
