import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase'; // تعديل المسار حسب المجلد لديك
import { Calendar, CheckCircle, Clock, AlertCircle, LogOut } from 'lucide-react';

interface StudentDashboardProps {
  student: {
    id: string;
    name: string;
    national_id: string;
    grade?: string;
  };
  onSelectActivity: (activity: any) => void;
  onLogout: () => void;
}

export default function StudentDashboard({ student, onSelectActivity, onLogout }: StudentDashboardProps) {
  const [activities, setActivities] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [student]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. جلب الأنشطة
      const { data: activitiesData, error: actError } = await supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false });

      if (actError) throw actError;

      // 2. جلب تسليمات الطالب الحالي
      const { data: submissionsData, error: subError } = await supabase
        .from('submissions')
        .select('*')
        .eq('student_id', student.id);

      if (subError) throw subError;

      const subsMap: Record<string, any> = {};
      submissionsData?.forEach((sub) => {
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

  return (
    <div className="min-h-screen bg-gray-50 dir-rtl font-sans pb-10">
      {/* الهيدر العلوي */}
      <header className="bg-emerald-800 text-white p-4 shadow-md">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">منصة العلوم للأنشطة والواجبات التفاعلية</h1>
            <p className="text-xs text-emerald-200 mt-1">
              مدرسة أبو العاص بن الربيع ومتوسطة الربيع بن خثيم | عام 1448 هـ - توقيت أم القرى
            </p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 mt-6">
        {/* كارت الطالب */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-gray-800">أهلاً بك الطالب: {student.name}</h2>
            <p className="text-sm text-gray-500 mt-1">
              الصف الدراسي: {student.grade || 'الأول المتوسط'} | الهوية: {student.national_id}
            </p>
          </div>
          <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-4 py-2 rounded-xl text-center">
            <span className="text-xs block text-emerald-600 font-medium">الأنشطة المسلمة</span>
            <span className="text-xl font-bold">{Object.keys(submissions).length} / {activities.length}</span>
          </div>
        </div>

        {/* قائمة الأنشطة */}
        <h3 className="text-md font-bold text-gray-700 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-600" />
          قائمة الأنشطة والواجبات المتاحة
        </h3>

        {loading ? (
          <div className="text-center py-10 text-gray-500">جاري تحميل الأنشطة...</div>
        ) : activities.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-500 shadow-sm border border-gray-100">
            لا توجد أنشطة متاحة حالياً.
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const submission = submissions[activity.id];
              const isSubmitted = submission && submission.score !== undefined && submission.score !== null;

              // معالجة صريحة للتواريخ بالأرقام المجردة لمنع مشاكل التوقيت العالمي UTC
              const dueTime = new Date(activity.due_date).getTime();
              const nowTime = new Date().getTime();
              const isExpired = nowTime > dueTime;

              return (
                <div key={activity.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="font-bold text-gray-800">{activity.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>
                        موعد النهاية: {new Date(activity.due_date).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* عرض الدرجة عند التسليم */}
                    {isSubmitted && (
                      <div className="flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-lg text-sm">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span>الدرجة: {submission.score} / {activity.max_score || 10}</span>
                      </div>
                    )}

                    {/* زر الإجراء الصارم */}
                    {isExpired ? (
                      <button
                        disabled
                        className="flex items-center gap-1 bg-gray-100 text-gray-400 font-medium px-4 py-2 rounded-lg cursor-not-allowed text-sm border border-gray-200"
                      >
                        <AlertCircle className="w-4 h-4" />
                        <span>انتهى موعد التسليم</span>
                      </button>
                    ) : isSubmitted ? (
                      <button
                        onClick={() => onSelectActivity(activity)}
                        className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-medium px-4 py-2 rounded-lg text-sm transition-colors"
                      >
                        تعديل الحل
                      </button>
                    ) : (
                      <button
                        onClick={() => onSelectActivity(activity)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors shadow-sm"
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

      <footer className="mt-12 text-center text-xs text-gray-500 py-4 border-t border-gray-200">
        إشراف المعلم: <span className="font-bold text-gray-700">عبدالعزيز آل فايع</span> | مدير المدرسة: <span className="font-bold text-gray-700">محمد الشهري</span>
      </footer>
    </div>
  );
}