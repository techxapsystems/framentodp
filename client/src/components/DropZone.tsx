import React, { useRef } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropZoneProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accept: string;
  onFile: (file: File) => void;
  file?: File;
  disabled?: boolean;
}

export function DropZone({
  icon,
  title,
  subtitle,
  accept,
  onFile,
  file,
  disabled = false,
}: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFile(files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFile(files[0]);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={cn(
        'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all',
        isDragging && !disabled
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50 hover:bg-secondary/30',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
      />

      {file ? (
        <div className="space-y-2">
          <div className="text-green-600 dark:text-green-400">✓</div>
          <p className="font-semibold text-foreground text-sm">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex justify-center text-muted-foreground">{icon}</div>
          <div>
            <p className="font-semibold text-foreground text-sm">{title}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <p className="text-xs text-muted-foreground/70">
            Arraste ou clique para selecionar
          </p>
        </div>
      )}
    </div>
  );
}
