import React, { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import type { Activity, Student } from '../../types';
import { Check, X, Type, Send, Trash2, CheckCircle } from 'lucide-react';

interface StudentViewProps {
  student: Student;
  activity: Activity;
  onSuccessSubmission?: () => void;
}

interface Annotation {
  id: string;
  type: 'check' | 'cross' | 'text';
  x: number; // نسبة مئوية %
  y: number; // نسبة مئوية %
  text?: string;
}

export const StudentView: React.FC<StudentViewProps> = ({ student, activity, onSuccessSubmission }) => {
  const [selectedTool, setSelectedTool] = useState<'check' | 'cross' | 'text'>('check');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [textInput, setTextInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const sheetRef = useRef<HTMLDivElement>(null);

  // إضافة علامة أو نص فوق ورقة العمل عند ضغط الطالب
  const handleSheetClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!sheetRef.current || submitted) return;

    const rect = sheetRef.current.getBoundingClientRect();
    // حساب موقع الضغطة كنسبة مئوية لضمان المطابقة على لوحة المعلم
    const xPct = Number((((e.clientX - rect.left) / rect.width) * 100).toFixed(2));
    const yPct = Number((((e.clientY - rect.top) / rect.height) * 100).toFixed(2));

    if (selectedTool === 'text' && !textInput.trim()) {
      alert('يرجى كتابة النص في الخانة المخصصة أولاً قبل الضغط على الورقة!');
      return;
    }

    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      type: selectedTool,
      x: xPct,
      y: yPct,
      text: selectedTool === 'text' ? textInput.trim() : undefined,
    };

    setAnnotations([...annotations, newAnnotation]);
    if (selectedTool === 'text') setTextInput('');
  };

  // حذف علامة محددة
  const handleRemoveAnnotation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAnnotations(annotations.filter((a) => a.id !== id));
  };

  // إرسال الإجابات والتسليم لقاعدة البيانات
  const handleSubmitAnswers = async () => {
    if (annotations.length === 0) {
      if (!window.confirm('لم تقم بإضافة أي إجابات أو علامات على الورقة. هل أنت متأكد من التسليم؟')) {
        return;
      }
    }

    setSubmitting(true);

    const { error } = await supabase.from('submissions').insert([
      {
        student_id: student.id,
        activity_id: activity.id,
        answers_data: annotations,
        submitted_at: new Date().toISOString(),
      },
    ]);

    setSubmitting(false);

    if (error) {
      alert('حدث خطأ أثناء إرسال الحل، يرجى المحاولة مرة أخرى.');
    } else {
      setSubmitted(true);
      if (onSuccessSubmission) onSuccessSubmission();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 p-4 font-sans dir-rtl">
      {/* شريط أدوات الحل التفاعلي */}
      {!submitted ? (
        <div className="bg-white p-4 rounded-2xl shadow-md border border-slate-200 space-y-3 sticky top-2 z-30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-700">اختر أداة الإجابة:</span>
              
              <button
                type="button"
                onClick={() => setSelectedTool('check')}
                className={`px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1 transition-all cursor-pointer ${
                  selectedTool === 'check'
                    ? 'bg-emerald-600 text-white shadow-md scale-105'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Check className="w-4 h-4" /> علامة (✓)
              </button>

              <button
                type="button"
                onClick={() => setSelectedTool('cross')}
                className={`px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1 transition-all cursor-pointer ${
                  selectedTool === 'cross'
                    ? 'bg-rose-600 text-white shadow-md scale-105'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <X className="w-4 h-4" /> علامة (✕)
              </button>

              <button
                type="button"
                onClick={() => setSelectedTool('text')}
                className={`px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1 transition-all cursor-pointer ${
                  selectedTool === 'text'
                    ? 'bg-blue-600 text-white shadow-md scale-105'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Type className="w-4 h-4" /> إجابة نصية
              </button>
            </div>

            <button
              onClick={handleSubmitAnswers}
              disabled={submitting}
              className="bg-[#006837] hover:bg-[#00522b] text-white px-5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" /> {submitting ? 'جاري الإرسال...' : 'تسليم ورقة الحل'}
            </button>
          </div>

          {/* حقل إدخال النص عند اختيار الكتابة */}
          {selectedTool === 'text' && (
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="اكتب الإجابة هنا ثم اضغط على المكان المطلوب في ورقة العمل..."
                className="w-full px-3 py-1.5 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      ) : (
        <div className="bg-emerald-50 border-2 border-emerald-500 text-emerald-800 p-4 rounded-2xl flex items-center gap-3 font-bold text-sm">
          <CheckCircle className="w-6 h-6 text-emerald-600" />
          <span>تم تسليم الورقة بنجاح! يمكنك استعراض إجاباتك أدناه.</span>
        </div>
      )}

      {/* ورقة العمل التفاعلية (PDF + Interactive Overlay) */}
      <div className="flex justify-center bg-slate-800 p-4 rounded-2xl shadow-inner overflow-auto">
        <div
          ref={sheetRef}
          onClick={handleSheetClick}
          className="relative bg-white rounded shadow-2xl overflow-hidden cursor-crosshair min-w-[750px] h-[1050px] select-none"
        >
          {/* خلفية الورقة (PDF) */}
          <iframe
            src={`${activity.pdf_url}#toolbar=0&navpanes=0`}
            title="Interactive PDF Sheet"
            className="w-full h-full border-none pointer-events-none"
          />

          {/* طبقة العلامات والحلول التفاعلية */}
          <div className="absolute inset-0 pointer-events-auto">
            {annotations.map((ann) => (
              <div
                key={ann.id}
                style={{ left: `${ann.x}%`, top: `${ann.y}%` }}
                className="absolute z-20 -translate-x-1/2 -translate-y-1/2 group"
              >
                {ann.type === 'text' && (
                  <div className="bg-blue-100/95 text-blue-900 font-black text-xs px-2.5 py-1 rounded border-2 border-blue-600 shadow-md flex items-center gap-1 whitespace-nowrap">
                    <span>{ann.text}</span>
                    {!submitted && (
                      <button
                        onClick={(e) => handleRemoveAnnotation(ann.id, e)}
                        className="p-0.5 hover:bg-rose-200 text-rose-700 rounded transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                {ann.type === 'check' && (
                  <div className="flex items-center justify-center bg-emerald-500 text-white border-2 border-white font-black rounded-full w-7 h-7 shadow-lg relative">
                    ✓
                    {!submitted && (
                      <button
                        onClick={(e) => handleRemoveAnnotation(ann.id, e)}
                        className="absolute -top-2 -right-2 bg-rose-600 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                {ann.type === 'cross' && (
                  <div className="flex items-center justify-center bg-rose-500 text-white border-2 border-white font-black rounded-full w-7 h-7 shadow-lg relative">
                    ✕
                    {!submitted && (
                      <button
                        onClick={(e) => handleRemoveAnnotation(ann.id, e)}
                        className="absolute -top-2 -right-2 bg-rose-600 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// تصدير مكون لوحة الطالب بالتوازي لتوافقه مع App.tsx
export const StudentDashboard: React.FC<{ student: Student }> = ({ student }) => {
  return (
    <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-4xl mx-auto my-6">
      <h2 className="text-[#006837] font-extrabold text-xl mb-2">
        أهلاً بك الطالب: {student.full_name}
      </h2>
      <p className="font-bold text-slate-600 text-sm">
        يرجى اختيار النشاط أو الواجب المتاح للبدء في الإجابة التفاعلية مباشرة على ورقة العمل.
      </p>
    </div>
  );
};