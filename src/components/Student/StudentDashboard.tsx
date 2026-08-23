import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { Activity, Submission } from '../../types';
import { InteractivePdfViewer } from './InteractivePdfViewer';
import { BookOpen, CheckCircle, Clock, FileText, AlertCircle, Award } from 'lucide-react';

interface StudentDashboardProps {
  student: {
    id: string;
    full_name: string;
    national_id: string;
    class_id: string;
    classes?: {
      name: string;
    };
  };
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ student }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchStudentActivities();
    fetchStudentSubmissions();
  }, [student.class_id, student.id]);

  const fetchStudentActivities = async () => {
    const { data } = await supabase
      .from('activities')
      .select('*, classes(*)')
      .eq('class_id', student.class_id)
      .order('created_at', { ascending: false });
    if (data) setActivities(data);
  };

  const fetchStudentSubmissions = async () => {
    const { data } = await supabase
      .from('submissions')
      .select('*')
      .eq('student_id', student.id);
    if (data) setSubmissions(data);
  };

  const getActivityStatus = (activity: Activity) => {
    const sub = submissions.find((s) => s.activity_id === activity.id);
    if (sub) return { status: 'submitted', label: 'تم التسليم', sub };

    const now = new Date().getTime();
    const end = new Date(activity.end_time).getTime();
    if (now > end) return { status: 'expired', label: 'انتهى الوقت ولم يتم التسليم', sub: undefined };

    return { status: 'active', label: 'متاح للحل', sub: undefined };
  };

  const handleSaveAnswers = async (annotations: any[]) => {
    if (!selectedActivity) return;
    setLoading(true);

    const existingSub = submissions.find((s) => s.activity_id === selectedActivity.id);

    if (existingSub) {
      const { error } = await supabase
        .from('submissions')
        .update({
          answers_data: annotations,
        })
        .eq('id', existingSub.id);

      setLoading(false);

      if (!error) {
        setMsg({ type: 'success', text: 'تم تحديث إجاباتك ورقة النشاط بنجاح!' });
        setSelectedActivity(null);
        fetchStudentSubmissions();
      } else {
        setMsg({ type: 'error', text: 'حدث خطأ أثناء حفظ الإجابات.' });
      }
    } else {
      const { error } = await supabase.from('submissions').insert([
        {
          student_id: student.id,
          activity_id: selectedActivity.id,
          answers_data: annotations,
          score: null,
          max_score: 10,
        },
      ]);

      setLoading(false);

      if (!error) {
        setMsg({ type: 'success', text: 'تم تسليم ورقة الحل بنجاح!' });
        setSelectedActivity(null);
        fetchStudentSubmissions();
      } else {
        setMsg({ type: 'error', text: 'حدث خطأ أثناء رفع تسليم ورقة الحل.' });
      }
    }
  };

  return (
    <div className="space-y-6">
      {msg && (
        <div className="p-4 rounded-xl flex items-center justify-between font-bold text-sm bg-emerald-50 text-emerald-800 border border-emerald-200">
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)}>×</button>
        </div>
      )}

      {/* 🔹 كارت الطالب الترحيبي */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800">أهلاً بك الطالب: {student.full_name}</h2>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            الصف الدراسي: <span className="text-[#006837] font-bold">{student.classes?.name || 'غير محدد'}</span> | الهوية: <span className="font-mono">{student.national_id}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
            <span className="block text-xs font-extrabold text-emerald-800">الأنشطة المسلمة</span>
            <span className="text-lg font-black text-[#006837] font-mono">{submissions.length} / {activities.length}</span>
          </div>
        </div>
      </div>

      {/* 🔹 واجهة العرض والتفاعل إذا تم اختيار نشاط للحل */}
      {selectedActivity ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg space-y-4">
          <div className="flex justify-between items-center border-b pb-4">
            <div>
              <h3 className="font-extrabold text-[#006837] text-lg">حل النشاط: {selectedActivity.title}</h3>
              <p className="text-xs text-slate-500 font-bold mt-0.5">انقر على الخيارات العلوية لإدراج الإجابات داخل الورقة التفاعلية</p>
            </div>
            <button
              onClick={() => setSelectedActivity(null)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              إلغاء والعودة
            </button>
          </div>

          <InteractivePdfViewer
            pdfUrl={selectedActivity.pdf_url}
            activityTitle={selectedActivity.title}
            onClose={() => setSelectedActivity(null)}
            onSaveAnswers={handleSaveAnswers}
            loading={loading}
          />
        </div>
      ) : (
        /* 🔹 جدول وقائمة الأنشطة والواجبات المطروحة */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#006837]" /> قائمة الأنشطة والواجبات المتاحة
            </h3>
          </div>

          <div className="divide-y divide-slate-100">
            {activities.length === 0 ? (
              <div className="p-10 text-center text-slate-400 font-bold">لا توجد أنشطة مطروحة لصفك الدراسي حالياً</div>
            ) : (
              activities.map((act) => {
                const { status, label, sub } = getActivityStatus(act);

                return (
                  <div key={act.id} className="p-5 flex flex-col md:flex-row justify-between items-center gap-4 hover:bg-slate-50 transition-colors">
                    <div className="space-y-1 text-right w-full md:w-auto">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[#006837]" />
                        <h4 className="font-black text-slate-800 text-base">{act.title}</h4>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 mr-7">
                        <span>موعد النهاية: <span className="font-mono text-slate-700">{new Date(act.end_time).toLocaleString('ar-SA')}</span></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                      {status === 'submitted' && (
                        <div className="flex items-center gap-3">
                          {sub?.score !== null && sub?.score !== undefined ? (
                            <span className="px-3.5 py-1.5 bg-emerald-100 text-[#006837] border border-emerald-300 font-black rounded-xl text-sm flex items-center gap-1">
                              <Award className="w-4 h-4" /> الدرجة: {sub.score} / {(sub as any)?.max_score || 10}
                            </span>
                          ) : (
                            <span className="px-3.5 py-1.5 bg-blue-50 text-blue-800 border border-blue-200 font-bold rounded-xl text-xs flex items-center gap-1">
                              <CheckCircle className="w-4 h-4 text-blue-600" /> تم التسليم (بانتظار التصحيح)
                            </span>
                          )}
                          <button
                            onClick={() => setSelectedActivity(act)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                          >
                            تعديل الحل
                          </button>
                        </div>
                      )}

                      {status === 'expired' && (
                        <span className="px-4 py-2 bg-rose-50 text-rose-700 border border-rose-200 font-extrabold rounded-xl text-xs flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" /> {label}
                        </span>
                      )}

                      {status === 'active' && (
                        <button
                          onClick={() => setSelectedActivity(act)}
                          className="px-5 py-2.5 bg-[#006837] hover:bg-[#00522b] text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Clock className="w-4 h-4" /> فتح والبدء بالحل
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};