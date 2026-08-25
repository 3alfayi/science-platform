import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Send, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { Activity, Student } from '../../types';

interface InteractivePdfViewerProps {
  student: Student;
  activity: Activity;
  onClose: () => void;
}

export default function InteractivePdfViewer({ student, activity, onClose }: InteractivePdfViewerProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const { error: submitError } = await supabase.from('submissions').insert([
        {
          activity_id: activity.id,
          student_id: student.id,
          answers_data: answers,
          submitted_at: new Date().toISOString(),
        },
      ]);

      if (submitError) throw submitError;

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('خطأ في تسليم الواجب:', err);
      setError('حدث خطأ أثناء إرسال الإجابات. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-4 md:p-6 dir-rtl text-right font-sans">
      <div className="border-b border-slate-200 pb-4 mb-6 flex justify-between items-center flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#006837]" />
            {activity.title}
          </h2>
          <p className="text-xs font-bold text-slate-500 mt-1">
            الطالب: <span className="text-[#006837]">{student.full_name}</span> | الصف: {student.classes?.name || 'غير محدد'}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-bold mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-[#006837] p-4 rounded-xl text-xs font-bold mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          تم إرسال إجاباتك بنجاح! جاري العودة للقائمة...
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* عرض ملف الـ PDF */}
        <div className="bg-slate-100 rounded-xl p-2 border border-slate-200 min-h-[500px] flex flex-col">
          <span className="text-xs font-bold text-slate-600 mb-2 block px-2">ورقة النشاط / الواجب التفاعلي:</span>
          {activity.pdf_url ? (
            <iframe
              src={`${activity.pdf_url}#toolbar=0`}
              title={activity.title}
              className="w-full h-[600px] rounded-lg border-none"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 font-bold text-xs">
              لا يوجد ملف PDF مرفق لهذا النشاط
            </div>
          )}
        </div>

        {/* نموذج الإجابة والملاحظات */}
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="font-extrabold text-sm text-slate-800 mb-2">إجابات وملاحظات الحل:</h3>
            <p className="text-xs text-slate-500 font-semibold mb-4">
              اكتب إجاباتك واستفساراتك حول هذا النشاط ليتم إرسالها إلى معلم المادة مباشرة:
            </p>

            <form id="submission-form" onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">صندوق إجابة النشاط:</label>
                <textarea
                  rows={8}
                  value={answers['main_answer'] || ''}
                  onChange={(e) => handleAnswerChange('main_answer', e.target.value)}
                  placeholder="اكتب إجاباتك هنا بالتفصيل..."
                  required
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#006837] bg-white"
                />
              </div>
            </form>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              إلغاء وعودة
            </button>
            <button
              type="submit"
              form="submission-form"
              disabled={isSubmitting || success}
              className="bg-[#006837] hover:bg-[#00522b] text-white px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'جاري إرسال الحل...' : 'إرسال الحل للمعلم'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}