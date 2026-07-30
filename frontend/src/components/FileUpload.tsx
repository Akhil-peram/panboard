import React, { useState, useCallback } from 'react';
import { uploadFile } from '../services/api';
import type { UploadResponse } from '../services/api';
import { UploadCloud, FileType, Loader2, CheckCircle2 } from 'lucide-react';

interface FileUploadProps {
  onUploadSuccess: (data: UploadResponse) => void;
  onUploadError: (error: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess, onUploadError }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const processFile = useCallback(async (file: File) => {
    setIsUploading(true);
    setIsSuccess(false);
    try {
      const result = await uploadFile(file);
      if (result.error) {
        onUploadError(result.error);
      } else {
        setIsSuccess(true);
        // Small delay to show success state before transition
        setTimeout(() => onUploadSuccess(result), 600);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred during upload';
      onUploadError(message);
    } finally {
      setIsUploading(false);
    }
  }, [onUploadError, onUploadSuccess]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      
      const file = e.dataTransfer.files[0];
      if (file) {
        await processFile(file);
      }
    },
    [processFile]
  );

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto group">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-[2.5rem] p-16 transition-all duration-500 text-center overflow-hidden ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/50 scale-[1.02] shadow-2xl shadow-indigo-100'
            : isSuccess 
              ? 'border-emerald-500 bg-emerald-50/30'
              : 'border-theme-border bg-theme-card hover:border-theme-accent hover:shadow-xl'
        }`}
      >
        <input
          type="file"
          aria-label="Upload dataset file in CSV, Excel, or ODS format"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          onChange={handleFileInput}
          accept=".csv,.xls,.xlsx,.xlsm,.xlsb,.ods"
          disabled={isUploading}
        />
        
        <div className="flex flex-col items-center justify-center space-y-6 relative z-0">
          <div className={`p-6 rounded-[2rem] transition-all duration-500 ${
            isUploading ? 'bg-indigo-100' : isSuccess ? 'bg-emerald-100' : 'bg-theme-bg group-hover:bg-theme-border'
          }`}>
            {isUploading ? (
              <Loader2 aria-hidden="true" className="h-10 w-10 text-indigo-600 animate-spin" />
            ) : isSuccess ? (
              <CheckCircle2 aria-hidden="true" className="h-10 w-10 text-emerald-600 animate-bounce" />
            ) : (
              <UploadCloud aria-hidden="true" className={`h-10 w-10 transition-colors duration-500 ${isDragging ? 'text-indigo-600' : 'text-theme-sub group-hover:text-theme-accent'}`} />
            )}
          </div>
          
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-theme-text tracking-tight">
              {isUploading ? 'Analyzing Data...' : isSuccess ? 'Success!' : 'Drop your data here'}
            </h3>
            <p className="text-theme-sub font-medium max-w-xs mx-auto">
              {isUploading 
                ? 'Processing columns and calculating statistics...' 
                : 'Click to browse or drag and drop your CSV or Excel files.'}
            </p>
          </div>

          {!isUploading && !isSuccess && (
            <div className="flex items-center space-x-3 pt-2">
              <span className="flex items-center text-[10px] font-bold uppercase tracking-widest text-theme-sub bg-theme-border px-3 py-1.5 rounded-full">
                <FileType className="h-3 w-3 mr-1.5" />
                CSV
              </span>
              <span className="flex items-center text-[10px] font-bold uppercase tracking-widest text-theme-sub bg-theme-border px-3 py-1.5 rounded-full">
                <FileType className="h-3 w-3 mr-1.5" />
                EXCEL
              </span>
            </div>
          )}
        </div>

        {/* Decorative elements */}
        <div className={`absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full blur-3xl transition-opacity duration-1000 ${isDragging ? 'bg-indigo-200 opacity-60' : 'opacity-0'}`} />
        <div className={`absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 rounded-full blur-3xl transition-opacity duration-1000 ${isDragging ? 'bg-purple-200 opacity-60' : 'opacity-0'}`} />
      </div>
    </div>
  );
};

export default FileUpload;
