import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import type { Activity, Student, Submission } from '../../types';
import { Check, X, Type, Send, Trash2, CheckCircle, Clock, FileText, ArrowRight, AlertTriangle } from 'lucide-react';

interface StudentViewProps {
  student: Student;
  activity: Activity;
  existingSubmission?: Submission;
  onSuccessSubmission?: () => void;
  onBack?: () => void;
}

interface Annotation {
  id: string;
  type: 'check' | 'cross' | 'text';
  x: number; // نسبة مئوية %
  y: number; // نسبة مئوية %
  text?: string;
}

export const StudentView: React.FC<StudentViewProps> = ({ student, activity, existingSubmission, onSuccessSubmission, onBack }) => {
  const [selectedTool, setSelectedTool] = useState<'check' | 'cross' | 'text'>('check');
  const [annotations, setAnnotations] = useState<Annotation[]>(() => {
    if (existingSubmission && Array.isArray(existingSubmission.answers_data)) {
      return existingSubmission.answers_data as Annotation[];
    }
    return [];
  });
  const [textInput, setTextInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(!!existingSubmission);
  
  const sheetRef = useRef<HTMLDivElement>(null);

  // 🔴 حاسبة الوقت اللحظية (توقيت أم القرى)
  const now = new Date().getTime();
  const startTime = new Date(activity.start_time).getTime();
  const endTime = new Date(activity.end_time).getTime();

  const isNotStarted = now < startTime;
  const isExpired = now > endTime;
  
  // حظر الحل أو التعديل إذا انتهى الوقت أو تم التسليم أو لم يبدأ الوقت بعد
  const isReadOnly = submitted || isExpired || isNotStarted;

  const handleSheetClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!sheetRef.current || isReadOnly) return;

    const rect = sheetRef.current.getBoundingClientRect();
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

  const handleRemoveAnnotation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isReadOnly) return;
    setAnnotations(annotations.filter((a) => a.id !== id));
  };

  const handleSubmitAnswers = async () => {
    const currentCheckNow = new Date().getTime();
    if (currentCheckNow > endTime) {
      alert('عذراً، انتهت المهلة الزمنية المحددة للنشاط للتو ولا يمكنك إرسال الحل!');
      return;
    }

    if (annotations.length === 0) {
      if (!window.confirm('لم تقم بإضافة أي إجابات أو علامات على الورقة. هل أنت متأكد من التسليم؟')) {
        return;
      }
    }

    setSubmitting(true);

    const { error } = await supabase.from('submissions').upsert(
      [
        {
          ...(existingSubmission?.id ? { id: existingSubmission.id } : {}),
          student_id: student.id,
          activity_id: activity.id,
          answers_data: annotations,
          score: existingSubmission?.score ?? null,
          max_score: (existingSubmission as any)?.max_score ?? 10,
          submitted_at: new Date().toISOString(),
        },
      ],
      { onConflict: 'student_id,activity_id' }
    );

    setSubmitting(false);

    if (error) {
      console.error('Supabase Error Details:', error);
      alert(`حدث خطأ أثناء إرسال الحل: ${error.message}`);
    } else {
      setSubmitted(true);
      alert('تم تسليم ورقة الحل بنجاح!');
      if (onSuccessSubmission) onSuccessSubmission();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 p-4 font-sans dir-rtl">
      {onBack && (
        <button
          onClick={onBack}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
        >
          <ArrowRight className="w-4 h-4" /> العودة للأنشطة
        </button>
      )}

      {/* شريط التنبيه الحصري بحالة المهلة */}
      {isExpired ? (
        <div className="bg-rose-50 border-2 border-rose-500 text-rose-800 p-4 rounded-2xl flex items-center gap-3 font-extrabold text-sm shadow-sm">
          <AlertTriangle className="w-6 h-6 text-rose-600 flex-shrink-0" />
          <span>انتهت المهلة الزمنية المحددة لحل هذا النشاط بتوقيت أم القرى. يتم الآن عرض إجاباتك السابقة/الورقة فقط بدون إمكانية التعديل.</span>
        </div>
      ) : isNotStarted ? (
        <div className="bg-blue-50 border-2 border-blue-500 text-blue-800 p-4 rounded-2xl flex items-center gap-3 font-extrabold text-sm shadow-sm">
          <Clock className="w-6 h-6 text-blue-600 flex-shrink-0" />
          <span>لم يبدأ موعد هذا النشاط بعد. يرجى الانتظار حتى الوقت المحدد.</span>
        </div>
      ) : !submitted ? (
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
        <div className="bg-emerald-50 border-2 border-emerald-500 text-emerald-800 p-4 rounded-2xl flex items-center gap-3 font-extrabold text-sm">
          <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
          <span>تم تسليم ورقة الحل بنجاح! يمكنك استعراض إجاباتك أدناه.</span>
        </div>
      )}

      {/* ورقة العمل التفاعلية (مقيدة عند الانتهاء) */}
      <div className="flex justify-center bg-slate-800 p-4 rounded-2xl shadow-inner overflow-auto">
        <div
          ref={sheetRef}
          onClick={handleSheetClick}
          className={`relative bg-white rounded shadow-2xl overflow-hidden min-w-[750px] h-[1050px] select-none ${
            isReadOnly ? 'cursor-not-allowed' : 'cursor-crosshair'
          }`}
        >
          <iframe
            src={`${activity.pdf_url}#toolbar=0&navpanes=0`}
            title="Interactive PDF Sheet"
            className="w-full h-full border-none pointer-events-none"
          />

          <div className={`absolute inset-0 ${isReadOnly ? 'pointer-events-none' : 'pointer-events-auto'}`}>
            {annotations.map((ann) => {
              const leftPos = typeof ann.x === 'number' && ann.x <= 100 ? `${ann.x}%` : `${ann.x}px`;
              const topPos = typeof ann.y === 'number' && ann.y <= 100 ? `${ann.y}%` : `${ann.y}px`;

              return (
                <div
                  key={ann.id}
                  style={{ left: leftPos, top: topPos }}
                  className="absolute z-20 -translate-x-1/2 -translate-y-1/2 group"
                >
                  {ann.type === 'text' && (
                    <div className="bg-blue-100/95 text-blue-900 font-black text-xs px-2.5 py-1 rounded border-2 border-blue-600 shadow-md flex items-center gap-1 whitespace-nowrap">
                      <span>{ann.text}</span>
                      {!isReadOnly && (
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
                      {!isReadOnly && (
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
                      {!isReadOnly && (
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
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export const StudentDashboard: React.FC<{ student: Student }> = ({ student }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentData();
  }, [student]);

  const fetchStudentData = async () => {
    setLoading(true);
    const { data: actData } = await supabase
      .from('activities')
      .select('*')
      .eq('class_id', student.class_id)
      .order('created_at', { ascending: false });

    const { data: subData } = await supabase
      .from('submissions')
      .select('*')
      .eq('student_id', student.id);

    if (actData) setActivities(actData);
    if (subData) setSubmissions(subData);
    setLoading(false);
  };

  if (selectedActivity) {
    const sub = submissions.find((s) => s.activity_id === selectedActivity.id);
    return (
      <StudentView
        student={student}
        activity={selectedActivity}
        existingSubmission={sub}
        onBack={() => {
          setSelectedActivity(null);
          fetchStudentData();
        }}
        onSuccessSubmission={() => fetchStudentData()}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 font-sans dir-rtl">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-[#006837] font-extrabold text-xl mb-1">
          أهلاً بك الطالب: {student.full_name}
        </h2>
        <p className="font-bold text-slate-500 text-xs">
          الصف الدراسي: {student.classes?.name || 'غير محدد'}
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#006837]" /> الأنشطة والواجبات المتاحة
        </h3>

        {loading ? (
          <div className="text-center p-8 bg-white rounded-2xl border text-slate-500 font-bold text-sm">
            جاري تحميل الأنشطة...
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-2xl border text-slate-400 font-bold text-sm">
            لا توجد أنشطة مطروحة لصفك الدراسي حالياً.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activities.map((act) => {
              const sub = submissions.find((s) => s.activity_id === act.id);
              const now = new Date().getTime();
              const start = new Date(act.start_time).getTime();
              const end = new Date(act.end_time).getTime();

              const isNotStarted = now < start;
              const isExpired = now > end;
              const isSubmitted = !!sub;

              return (
                <div key={act.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-extrabold text-slate-800 text-base">{act.title}</h4>
                    {isSubmitted ? (
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-extrabold inline-flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> تم التسليم
                      </span>
                    ) : isNotStarted ? (
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-extrabold inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> لم يبدأ بعد
                      </span>
                    ) : isExpired ? (
                      <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg text-xs font-extrabold inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> انتهى الموعد
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-extrabold inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> متاح للحل
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 font-mono space-y-1">
                    <p>يبدأ: {new Date(act.start_time).toLocaleString('ar-SA')}</p>
                    <p>ينتهي: {new Date(act.end_time).toLocaleString('ar-SA')}</p>
                    {sub?.score !== null && sub?.score !== undefined && (
                      <p className="text-[#006837] font-black text-sm pt-1">الدرجة المكتسبة: {sub.score} / {(sub as any).max_score || 10}</p>
                    )}
                  </div>

                  <button
                    disabled={isNotStarted || (isExpired && !isSubmitted)}
                    onClick={() => setSelectedActivity(act)}
                    className={`w-full py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                      isSubmitted
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer'
                        : isNotStarted
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : isExpired
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-[#006837] text-white hover:bg-[#00522b] shadow-md cursor-pointer'
                    }`}
                  >
                    {isSubmitted
                      ? 'استعراض الإجابات'
                      : isNotStarted
                      ? 'لم يبدأ الوقت المحدد للحل بعد'
                      : isExpired
                      ? 'انتهت فترة الحل'
                      : 'بدء حل ورقة العمل التفاعلية'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};