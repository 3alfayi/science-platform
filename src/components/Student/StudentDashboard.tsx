import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { Activity, Student } from '../../types';
import { Check, X, Send, LogOut, FileText, AlertCircle, Trash2 } from 'lucide-[#006837]';

interface StudentDashboardProps {
  student: Student;
  onLogout: () => void;
}

interface AnswerAnnotation {
  id: string;
  type: 'text' | 'check' | 'cross';
  x: number;
  y: number;
  text?: string;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ student, onLogout }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [annotations, setAnnotations] = useState<AnswerAnnotation[]>([]);
  const [activeTool, setActiveTool] = useState<'text' | 'check' | 'cross'>('check');
  const [inputText, setInputText] = useState('');
  const [submittedActivityIds, setSubmittedActivityIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchStudentActivities();
  }, [student]);

  const fetchStudentActivities = async () => {
    setLoading(true);
    const { data: acts } = await supabase
      .from('activities')
      .select('*')
      .eq('class_id', student.class_id)
      .order('created_at', { ascending: false });

    if (acts) setActivities(acts);

    const { data: subs } = await supabase
      .from('submissions')
      .select('activity_id')
      .eq('student_id', student.id);

    if (subs) {
      setSubmittedActivityIds(subs.map((s) => s.activity_id));
    }
    setLoading(false);
  };

  const isExpired = (endTimeStr: string) => {
    return new Date().getTime() > new Date(endTimeStr).getTime();
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!selectedActivity) return;

    const rect = e.currentTarget.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const xPercent = ((clientX - rect.left) / rect.width) * 100;
    const yPercent = ((clientY - rect.top) / rect.height) * 100;

    if (activeTool === 'text') {
      if (!inputText.trim()) {
        alert('يرجى كتابة النص في الخانة المخصصة أولاً قبل الضغط على الورقة');
        return;
      }
      setAnnotations([
        ...annotations,
        { id: Math.random().toString(36).substring(7), type: 'text', x: xPercent, y: yPercent, text: inputText.trim() }
      ]);
      setInputText('');
    } else {
      setAnnotations([
        ...annotations,
        { id: Math.random().toString(36).substring(7), type: activeTool, x: xPercent, y: yPercent }
      ]);
    }
  };

  const handleRemoveAnnotation = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setAnnotations(annotations.filter((a) => a.id !== id));
  };

  const handleSubmit = async () => {
    if (!selectedActivity) return;
    if (annotations.length === 0) {
      setMsg({ type: 'error', text: 'يرجى إجابة ورقة النشاط بوضع العلامات أو النصوص قبل الإرسال.' });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('submissions').insert([
      {
        student_id: student.id,
        activity_id: selectedActivity.id,
        answers_data: annotations,
        submitted_at: new Date().toISOString(),
      },
    ]);

    setLoading(false);
    if (error) {
      setMsg({ type: 'error', text: 'حدث خطأ أثناء إرسال الحل، يرجى المحاولة مرة أخرى.' });
    } else {
      setMsg({ type: 'success', text: 'تم إرسال إجابتك بنجاح للمعلم!' });
      setSelectedActivity(null);
      setAnnotations([]);
      fetchStudentActivities();
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
        <div>
          <h2 className="text-lg font-black text-[#006837]">{student.full_name}</h2>
          <p className="text-xs text-slate-500 font-bold mt-0.5">الصف: {student.classes?.name || 'محدد'}</p>
        </div>
        <button
          onClick={onLogout}
          className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
        >
          <LogOut className="w-4 h-4" /> خروج
        </button>
      </div>

      {msg && (
        <div className="p-4 rounded-xl flex items-center justify-between font-bold text-sm bg-emerald-50 text-emerald-800 border border-emerald-200">
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)}>×</button>
        </div>
      )}

      {!selectedActivity ? (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#006837]" /> الأنشطة والواجبات المتاحة
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activities.length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-sm font-bold col-span-2">لا توجد أنشطة مطروحة لصفك الدراسي حالياً</p>
            ) : (
              activities.map((act) => {
                const isSub = submittedActivityIds.includes(act.id);
                const isExp = isExpired(act.end_time);

                return (
                  <div key={act.id} className="p-4 border rounded-xl space-y-3 bg-slate-50/50">
                    <div className="flex justify-between items-start">
                      <h4 className="font-black text-slate-800 text-sm">{act.title}</h4>
                      {isSub ? (
                        <span className="px-2.5 py-1 bg-emerald-100 text-[#006837] text-xs font-extrabold rounded-lg">✅ تم الحل</span>
                      ) : isExp ? (
                        <span className="px-2.5 py-1 bg-rose-100 text-rose-700 text-xs font-extrabold rounded-lg">⏰ انتهى الوقت</span>
                      ) : (
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-extrabold rounded-lg">⏳ متاح للحل</span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500 font-bold space-y-0.5">
                      <p>ينتهي في: {new Date(act.end_time).toLocaleString('ar-SA')}</p>
                    </div>

                    {!isSub && !isExp && (
                      <button
                        onClick={() => {
                          setSelectedActivity(act);
                          setAnnotations([]);
                        }}
                        className="w-full bg-[#006837] hover:bg-[#00522b] text-white font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        بدء حل النشاط الآن
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-4 md:p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h3 className="font-black text-[#006837] text-base">{selectedActivity.title}</h3>
              <p className="text-xs text-slate-400 font-bold">اضغط على الورقة لوضع إجابتك، ويمكنك الضغط على أي إجابة لحذفها</p>
            </div>
            <button
              onClick={() => setSelectedActivity(null)}
              className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold"
            >
              إلغاء العودة
            </button>
          </div>

          {/* شريط أدوات الإجابة المخصص للجوال */}
          <div className="bg-slate-100 p-2 rounded-xl flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveTool('check')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1 ${
                  activeTool === 'check' ? 'bg-emerald-600 text-white shadow' : 'bg-white text-slate-700'
                }`}
              >
                <Check className="w-4 h-4" /> علامة (صح)
              </button>
              <button
                type="button"
                onClick={() => setActiveTool('cross')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1 ${
                  activeTool === 'cross' ? 'bg-rose-600 text-white shadow' : 'bg-white text-slate-700'
                }`}
              >
                <X className="w-4 h-4" /> علامة (خطأ)
              </button>
              <button
                type="button"
                onClick={() => setActiveTool('text')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-extrabold ${
                  activeTool === 'text' ? 'bg-[#006837] text-white shadow' : 'bg-white text-slate-700'
                }`}
              >
                كتابة نص
              </button>
            </div>

            {activeTool === 'text' && (
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="اكتب الإجابة هنا ثم انقر في الورقة..."
                className="w-full sm:w-64 p-2 bg-white border rounded-lg text-xs font-bold outline-none"
              />
            )}
          </div>

          {/* مساحة الـ PDF والتفاعل مع الإجابات مع خيار الحذف للجوال */}
          <div className="p-2 md:p-4 bg-slate-700 overflow-auto flex justify-center border-2 border-slate-200 rounded-xl">
            <div
              onClick={handleCanvasClick}
              className="relative bg-white shadow-2xl rounded overflow-hidden min-w-[700px] min-h-[950px] cursor-crosshair touch-none"
            >
              <iframe
                src={`${selectedActivity.pdf_url}#toolbar=0&navpanes=0`}
                title="Activity PDF"
                className="w-[700px] h-[1000px] pointer-events-none select-none"
              />

              {/* رص الإجابات الموضوعة */}
              {annotations.map((ann) => (
                <div
                  key={ann.id}
                  style={{ left: `${ann.x}%`, top: `${ann.y}%` }}
                  onClick={(e) => handleRemoveAnnotation(ann.id, e)}
                  onTouchEnd={(e) => handleRemoveAnnotation(ann.id, e)}
                  className="absolute z-20 -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                >
                  {/* زر حذف علوي يظهر بوضوح لمستخدم الجوال */}
                  <button
                    type="button"
                    onClick={(e) => handleRemoveAnnotation(ann.id, e)}
                    className="absolute -top-3 -right-3 bg-rose-600 text-white rounded-full p-1 shadow-md z-30 flex items-center justify-center active:scale-125 transition-transform"
                    title="حذف الإجابة"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {ann.type === 'text' && (
                    <div className="bg-emerald-100 text-[#006837] font-extrabold text-xs px-2.5 py-1 rounded border-2 border-[#006837] shadow-lg flex items-center gap-1">
                      {ann.text}
                    </div>
                  )}
                  {ann.type === 'check' && (
                    <div className="flex items-center justify-center bg-emerald-100 border-2 border-emerald-600 text-emerald-800 rounded-full p-1.5 shadow-lg">
                      <Check className="w-6 h-6 font-black" />
                    </div>
                  )}
                  {ann.type === 'cross' && (
                    <div className="flex items-center justify-center bg-rose-100 border-2 border-rose-600 text-rose-800 rounded-full p-1.5 shadow-lg">
                      <X className="w-6 h-6 font-black" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-[#006837] hover:bg-[#00522b] text-white font-extrabold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Send className="w-4 h-4" /> إرسال ورقة الحل للمعلم
            </button>
          </div>
        </div>
      )}
    </div>
  );
};