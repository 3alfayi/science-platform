import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, CheckCircle, Clock, AlertCircle, Lock, TimerOff } from 'lucide-react';

interface StudentDashboardProps {
  student: any;
  onSelectActivity?: (activity: any) => void;
  onLogout?: () => void;
}

export function StudentDashboard({ student, onSelectActivity }: StudentDashboardProps) {
  const [activities, setActivities] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchData();
  }, [student]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: activitiesData, error: actError } = await supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false });

      if (actError) throw actError;

      const { data: submissionsData, error: subError } = await supabase
        .from('submissions')
        .select('*')
        .eq('student_id', student?.id);

      if (subError) throw subError;

      const subsMap: Record<string, any> = {};
      submissionsData?.forEach((sub: any) => {
        subsMap[sub.activity_id] = sub;
      });

      setActivities(activitiesData || []);
      setSubmissions(subsMap);
    } catch (error) {
      console.error('خطأ في جلب البيانات:', error);
    } finally {
      setLoading(false);
    }
  };

  // دالة تنسيق التاريخ والوقت بأمان لمنع ظهور Invalid Date
  const formatDate = (dateStr: any) => {
    if (!dateStr) return 'غير محدد';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'غير محدد';
    return d.toLocaleString('ar-SA', {
      timeZone: 'Asia/Riyadh',
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  return (
    <div className="dir-rtl font-sans pb-10">
      <main className="max-w-7xl mx-auto p-2 md:p-4">
        {/* بيانات الطالب */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-black text-slate-800">أهلاً بك الطالب: {student?.full_name || student?.name}</h2>
            <p className="text-xs text-slate-500 font-bold mt-1">
              الصف الدراسي: {student?.classes?.name || student?.grade || 'الأول المتوسط'} | الهوية: {student?.national_id}
            </p>
          </div>
          <div className="bg-emerald-50 text-[#006837] border border-emerald-200 px-4 py-2 rounded-xl text-center">
            <span className="text-xs block font-bold text-emerald-700">الأنشطة المسلمة</span>
            <span className="text-xl font-black">{Object.keys(submissions).length} / {activities.length}</span>
          </div>
        </div>

        {/* قائمة الأنشطة والواجبات المتاحة */}
        <h3 className="text-md font-bold text-slate-700 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#006837]" />
          قائمة الأنشطة والواجبات المتاحة
        </h3>

        {loading ? (
          <div className="text-center py-10 text-slate-500 font-bold">جاري تحميل الأنشطة...</div>
        ) : activities.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-slate-400 font-bold shadow-sm border border-slate-200">
            لا توجد أنشطة متاحة حالياً.
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const submission = submissions[activity.id];
              const isSubmitted = submission !== undefined && submission !== null;

              const now = Date.now();
              const startDate = activity.start_date ? new Date(activity.start_date).getTime() : 0;
              const dueDate = activity.due_date ? new Date(activity.due_date).getTime() : Infinity;

              const hasNotStarted = activity.start_date ? now < startDate : false;
              const isExpired = activity.due_date ? now > dueDate : false;

              return (
                <div key={activity.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-800">{activity.title}</h4>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-semibold">
                      {activity.start_date && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span>تاريخ البداية: {formatDate(activity.start_date)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>موعد النهاية: {formatDate(activity.due_date)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* عرض حالة الدرجة أو التصحيح */}
                    {isSubmitted && (
                      <div className="flex items-center gap-1 bg-emerald-50 text-[#006837] font-bold px-3 py-1.5 rounded-xl text-xs border border-emerald-200">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span>
                          {submission.score !== undefined && submission.score !== null
                            ? `الدرجة: ${submission.score} / ${activity.max_score || 10}`
                            : 'تم التسليم (بانتظار التصحيح)'}
                        </span>
                      </div>
                    )}

                    {/* الشروط الـ 5 الصارمة لإلغاء أي زر للتعديل */}
                    {hasNotStarted ? (
                      <button
                        disabled
                        className="flex items-center gap-1 bg-amber-50 text-amber-600 border border-amber-200 font-bold px-4 py-2 rounded-xl text-xs cursor-not-allowed"
                      >
                        <TimerOff className="w-4 h-4" />
                        <span>لم يبدأ الموعد بعد</span>
                      </button>
                    ) : isExpired && isSubmitted ? (
                      <button
                        disabled
                        className="flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-200 font-bold px-4 py-2 rounded-xl text-xs cursor-not-allowed"
                      >
                        <Lock className="w-4 h-4" />
                        <span>انتهى الموعد وتم التسليم</span>
                      </button>
                    ) : isExpired && !isSubmitted ? (
                      <button
                        disabled
                        className="flex items-center gap-1 bg-rose-50 text-rose-600 border border-rose-200 font-bold px-4 py-2 rounded-xl text-xs cursor-not-allowed"
                      >
                        <AlertCircle className="w-4 h-4" />
                        <span>انتهى الموعد ولم يتم التسليم</span>
                      </button>
                    ) : isSubmitted ? (
                      <button
                        disabled
                        className="flex items-center gap-1 bg-slate-100 text-slate-500 border border-slate-200 font-bold px-4 py-2 rounded-xl text-xs cursor-not-allowed"
                      >
                        <Lock className="w-4 h-4" />
                        <span>تم التسليم (مغلق)</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onSelectActivity && onSelectActivity(activity)}
                        className="bg-[#006837] hover:bg-[#00522b] text-white font-extrabold px-5 py-2 rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
                      >
                        بدء الحل
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default StudentDashboard;