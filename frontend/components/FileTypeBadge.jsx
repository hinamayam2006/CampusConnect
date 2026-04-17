'use client';

function inferKind(fileType = '', fileName = '') {
  const text = `${fileType} ${fileName}`.toLowerCase();
  if (text.includes('pdf')) return { label: 'PDF', cls: 'danger' };
  if (text.includes('doc')) return { label: 'DOC', cls: 'primary' };
  if (text.includes('ppt')) return { label: 'PPT', cls: 'warning' };
  if (text.includes('xls') || text.includes('sheet') || text.includes('csv')) return { label: 'SHEET', cls: 'success' };
  if (text.includes('image') || text.includes('jpg') || text.includes('jpeg') || text.includes('png') || text.includes('webp')) return { label: 'IMG', cls: 'success' };
  if (text.includes('zip') || text.includes('rar')) return { label: 'ARCHIVE', cls: 'secondary' };
  return { label: 'FILE', cls: 'secondary' };
}

export default function FileTypeBadge({ fileType = '', fileName = '' }) {
  const meta = inferKind(fileType, fileName);
  return <span className={`badge text-bg-${meta.cls}`}>{meta.label}</span>;
}
