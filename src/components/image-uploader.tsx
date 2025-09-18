"use client";

import { useCallback, useRef, useState } from "react";

type ImageUploaderProps = {
  label: string;
  value?: string;
  onChange: (url: string | null) => void;
  accept?: string;
  containerClassName?: string;
};

export function ImageUploader({ label, value, onChange, accept = "image/*", containerClassName }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const uploadFile = useCallback(async (file: File) => {
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error || "Не удалось загрузить файл");
      return;
    }
    onChange(String(data.url));
  }, [onChange]);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    void uploadFile(file);
  }, [uploadFile]);

  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  }, [handleFiles]);

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setIsDragging(false), []);

  return (
    <div className={containerClassName ?? "rounded-lg border border-slate-200 bg-white p-4 shadow-sm"}>
      <div className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <div
          className={`flex flex-col items-center justify-center gap-3 rounded-md border px-4 py-6 text-center transition ${
            isDragging ? "border-slate-900 bg-slate-50" : "border-slate-300"
          }`}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
        >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Загруженное изображение" className="max-h-48 w-full rounded-md object-cover" />
        ) : (
          <p className="text-slate-500">Перетащите файл сюда или нажмите для выбора</p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:border-slate-400"
            onClick={() => inputRef.current?.click()}
          >
            Загрузить изображение
          </button>
          {value && (
            <button
              type="button"
              className="rounded-md border border-transparent px-3 py-1.5 text-sm text-red-600 hover:text-red-700"
              onClick={() => onChange(null)}
            >
              Удалить
            </button>
          )}
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}


