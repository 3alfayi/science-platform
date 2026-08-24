import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, CheckCircle, Clock, AlertCircle, Lock, TimerOff } from 'lucide-react';
import InteractivePdfViewer from './InteractivePdfViewer';

interface StudentDashboardProps {
  student: any;
  onLogout?: () => void;
}

export function StudentDashboard({ student }: StudentDashboardProps) {
  const [activities, setActivities] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);

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

  // دالة قراءة التاريخ الآمنة من حقول المعلم
  const getTeacherDate = (activity: any, possibleFields: string[]) => {
    for (const field of possibleFields) {
      if (activity && activity[field]) {
        const d = new Date(activity[field]);
        if (!isNaN(d.getTime())) return d;
      }
    }
    return null;
  };

  // دالة تنسيق التاريخ بتوقيت أم القرى والرياض
  const formatDate = (dateObj: Date | null) => {
    if (!dateObj) return 'غير محدد في النظام';
    return dateObj.toLocaleString('ar-SA', {
      timeZone: 'Asia/Riyadh',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // إذا تم اختيار نشاط لفتحه والحل
  if (selectedActivity) {
    return (
      <div className="dir-rtl font-sans p-4">
        <button
          onClick={() => {
            setSelectedActivity(null);
            fetchData();
          }}
          className="mb-4 bg-slate-800 hover:bg-slate-700 text-white text-xs px-4 py-2 rounded-xl font-bold cursor-pointer transition-colors"
        >
          ← العودة لقائمة الأنشطة
        </button>
        <InteractivePdfViewer
          student={student}
          activity={selectedActivity}
          onClose={() => {
            setSelectedActivity(null);
            fetchData();
          }}
        />
      </div>
    );
  }

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

        {/* قائمة الأنشطة المتاحة */}
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

              // جلب التواريخ الحقيقية المحددة بواسطة المعلم
              const startDateObj = getTeacherDate(activity, ['start_date', 'start_at', 'created_at']);
              const dueDateObj = getTeacherDate(activity, ['due_date', 'due_at', 'end_date', 'deadline']);

              const now = Date.now();
              const startDateMs = startDateObj ? startDateObj.getTime() : 0;
              const dueDateMs = dueDateObj ? dueDateObj.getTime() : 0;

              // التحقق الدقيق من الشروط الزمانية
              const hasNotStarted = startDateObj ? now < startDateMs : false;
              const isExpired = dueDateObj ? now > dueDateMs : false;

              return (
                <div key={activity.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 text-base">{activity.title}</h4>
                    
                    {/* عرض التواريخ المسحوبة مباشرة من حساب المعلم */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 font-semibold">
                      <div className="flex items-center gap-1 bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg border border-amber-200">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>تاريخ البداية: {formatDate(startDateObj)}</span>
                      </div>

                      <div className="flex items-center gap-1 bg-slate-50 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>موعد النهاية: {formatDate(dueDateObj)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* عرض حالة الدرجة والتسليم */}
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

                    {/* تطبيق شروط الأزرار المحددة بصلابة */}
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
                        onClick={() => setSelectedActivity(activity)}
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