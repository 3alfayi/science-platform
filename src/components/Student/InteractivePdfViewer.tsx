import React, { useState, useRef } from 'react';
import { Type, Check, X, Eraser, Send } from 'lucide-react';

export interface Annotation {
  id: string;
  type: 'text' | 'check' | 'cross';
  x: number;
  y: number;
  text?: string;
}

interface InteractivePdfViewerProps {
  pdfUrl: string;
  activityTitle?: string;
  onClose?: () => void;
  onSaveAnswers: (annotations: Annotation[]) => Promise<void> | void;
  loading?: boolean;
}

export const InteractivePdfViewer: React.FC<InteractivePdfViewerProps> = ({
  pdfUrl,
  activityTitle = 'ورقة النشاط',
  onClose,
  onSaveAnswers,
  loading = false,
}) => {
  const [activeTool, setActiveTool] = useState<'text' | 'check' | 'cross' | 'eraser'>('text');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [textInput, setTextInput] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || activeTool === 'eraser') return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'text') {
      const newAnn: Annotation = {
        id: Date.now().toString(),
        type: 'text',
        x,
        y,
        text: textInput.trim() || 'إجابة',
      };
      setAnnotations([...annotations, newAnn]);
    } else if (activeTool === 'check' || activeTool === 'cross') {
      const newAnn: Annotation = {
        id: Date.now().toString(),
        type: activeTool,
        x,
        y,
      };
      setAnnotations([...annotations, newAnn]);
    }
  };

  const handleRemoveAnnotation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeTool === 'eraser') {
      setAnnotations(annotations.filter((ann) => ann.id !== id));
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-800 text-white p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-emerald-400 pl-2 border-l border-slate-700">{activityTitle}</span>
          <button
            type="button"
            onClick={() => setActiveTool('text')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTool === 'text' ? 'bg-[#006837] text-white' : 'bg-slate-700 hover:bg-slate-600'
            }`}
          >
            <Type className="w-4 h-4" /> نص
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('check')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTool === 'check' ? 'bg-emerald-600 text-white' : 'bg-slate-700 hover:bg-slate-600'
            }`}
          >
            <Check className="w-4 h-4" /> علامة صح
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('cross')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTool === 'cross' ? 'bg-rose-600 text-white' : 'bg-slate-700 hover:bg-slate-600'
            }`}
          >
            <X className="w-4 h-4" /> علامة خطأ
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('eraser')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTool === 'eraser' ? 'bg-amber-600 text-white' : 'bg-slate-700 hover:bg-slate-600'
            }`}
          >
            <Eraser className="w-4 h-4" /> ممحاة
          </button>
        </div>

        {activeTool === 'text' && (
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="اكتب الإجابة هنا ثم انقر على الورقة..."
            className="px-3 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-[#006837] w-64"
          />
        )}

        <div className="flex items-center gap-2 mr-auto">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold"
            >
              إلغاء
            </button>
          )}
          <button
            type="button"
            disabled={loading || annotations.length === 0}
            onClick={() => onSaveAnswers(annotations)}
            className="bg-[#006837] hover:bg-[#00522b] disabled:opacity-50 text-white px-5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" /> تسليم ورقة الحل النهائي
          </button>
        </div>
      </div>

      <div className="p-4 bg-slate-700 overflow-auto flex justify-center border-2 border-slate-200 rounded-2xl shadow-inner">
        <div
          ref={containerRef}
          onClick={handleContainerClick}
          className="relative bg-white shadow-2xl rounded overflow-hidden min-w-[750px] min-h-[1000px] cursor-crosshair"
        >
          <iframe
            src={`${pdfUrl}#toolbar=0&navpanes=0`}
            title="Student Worksheet"
            className="w-[750px] h-[1050px] pointer-events-none"
          />

          {annotations.map((ann) => (
            <div
              key={ann.id}
              onClick={(e) => handleRemoveAnnotation(ann.id, e)}
              style={{ left: `${ann.x}px`, top: `${ann.y}px` }}
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
            >
              {ann.type === 'text' && (
                <div className="bg-emerald-100/95 text-[#006837] font-extrabold text-xs px-2.5 py-1 rounded border-2 border-[#006837] shadow-lg">
                  {ann.text}
                </div>
              )}
              {ann.type === 'check' && (
                <div className="flex items-center justify-center bg-emerald-100 border-2 border-emerald-600 text-emerald-800 rounded-full p-1 shadow-lg">
                  <Check className="w-5 h-5 font-black" />
                </div>
              )}
              {ann.type === 'cross' && (
                <div className="flex items-center justify-center bg-rose-100 border-2 border-rose-600 text-rose-800 rounded-full p-1 shadow-lg">
                  <X className="w-5 h-5 font-black" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};