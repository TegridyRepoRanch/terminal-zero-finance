// File Drop Zone Component
// Drag & drop or click to upload PDF files

import { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';

interface FileDropZoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number; // in bytes
  disabled?: boolean;
}

export function FileDropZone({
  onFileSelect,
  accept = '.pdf',
  maxSize = 50 * 1024 * 1024, // 50MB default
  disabled = false,
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return 'Please upload a PDF file';
    }
    if (file.size > maxSize) {
      return `File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`;
    }
    return null;
  };

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      onFileSelect(file);
    },
    [onFileSelect, maxSize]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile, disabled]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    if (disabled) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      const files = target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    };
    input.click();
  }, [accept, handleFile, disabled]);

  return (
    <div className="w-full">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-lg p-12 text-center
          transition-all duration-200 cursor-pointer
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${
            isDragging
              ? 'border-emerald-500 bg-emerald-500/10'
              : 'border-zinc-700 hover:border-zinc-500 bg-zinc-900/50'
          }
        `}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className={`
            p-4 rounded-full transition-colors
            ${isDragging ? 'bg-emerald-500/20' : 'bg-zinc-800'}
          `}
          >
            {isDragging ? (
              <FileText className="w-10 h-10 text-emerald-500" />
            ) : (
              <Upload className="w-10 h-10 text-zinc-400" />
            )}
          </div>

          <div>
            <p className="text-lg font-medium text-zinc-200">
              {isDragging ? 'Drop your file here' : 'Drag & drop your SEC filing'}
            </p>
            <p className="text-sm text-zinc-500 mt-1">
              or click to browse (10-K or 10-Q PDF)
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs text-zinc-600">
            <span>PDF only</span>
            <span className="w-1 h-1 bg-zinc-600 rounded-full" />
            <span>Max {Math.round(maxSize / 1024 / 1024)}MB</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
