import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Student, Activity, Submission } from '../types';
import { Printer } from 'lucide-react';

export const PublicStudentReport: React.FC<{ studentId: string }> = ({ studentId }) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    loadData();
  }, [studentId]);

  const loadData = async () => {
    const { data: stData } = await supabase
      .from('students')
      .select('*, classes(*)')
      .eq('id', studentId)
      .single();

    if (stData) {
      setStudent(stData);

      const { data: actData } = await supabase
        .from('activities')
        .select('*')
        .eq('class_id', stData.class_id);
      if (actData) setActivities(actData);

      const { data: subData } = await supabase
        .from('submissions')
        .select('*')
        .eq('student_id', studentId);
      if (subData) setSubmissions(subData);
    }
  };

  if (!student) return <div className="p-12 text-center font-bold text-slate-500">جاري تحميل تقرير الطالب...</div>;

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8 flex flex-col items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden p-8 space-y-6 text-slate-800 font-sans print:p-0 print:shadow-none print:border-none">
        
        <div className="border-b-2 border-[#006837] pb-4 flex justify-between items-center text-center">
          <div className="text-right">
            <p className="text-xs font-bold">المملكة العربية السعودية</p>
            <p className="text-xs font-bold">وزارة التعليم</p>
            <p className="text-xs font-bold text-[#006837]">مدرسة أبو العاص بن الربيع ومتوسطة الربيع بن خثيم</p>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-black text-[#006837]">تقرير الأداء الشامل لمادة العلوم</h2>
            <p className="text-xs font-semibold text-slate-500 mt-1">عام 1448 هـ - توقيت أم القرى</p>
          </div>
          <div className="text-left text-xs font-bold">
            <p>التاريخ: {new Date().toLocaleDateString('ar-SA')}</p>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-3 gap-4 text-xs font-bold">
          <div>اسم الطالب: <span className="text-[#006837] font-black">{student.full_name}</span></div>
          <div>رقم الهوية: <span className="font-mono">{student.national_id}</span></div>
          <div>الصف الدراسي: <span>{student.classes?.name || 'غير محدد'}</span></div>
        </div>

        <div>
          <h4 className="font-extrabold text-sm text-slate-800 mb-3">سجل الأنشطة والواجبات المنجزة:</h4>
          <table className="w-full text-right border-collapse text-xs border border-slate-200">
            <thead>
              <tr className="bg-[#006837] text-white font-bold">
                <th className="p-2 border text-center">م</th>
                <th className="p-2 border">عنوان النشاط</th>
                <th className="p-2 border text-center">حالة التسليم</th>
                <th className="p-2 border text-center">الدرجة المحرزة</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((act, i) => {
                const sub = submissions.find((s) => s.activity_id === act.id);
                return (
                  <tr key={act.id} className="border-b border-slate-200">
                    <td className="p-2 border text-center font-mono">{i + 1}</td>
                    <td className="p-2 border font-bold">{act.title}</td>
                    <td className="p-2 border text-center">
                      {sub ? <span className="text-emerald-700 font-bold">✅ تم التسليم</span> : <span className="text-rose-600 font-bold">❌ لم يتم التسليم</span>}
                    </td>
                    <td className="p-2 border text-center font-bold">
                      {sub?.score !== null && sub?.score !== undefined ? `${sub.score}` : sub ? 'قيد التصحيح' : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="pt-8 border-t flex justify-between items-center text-xs font-bold text-center">
          <div>
            <p>معلم المادة</p>
            <p className="text-[#006837] mt-2 text-sm">عبدالعزيز آل فايع</p>
          </div>
          <div>
            <p>مدير المدرسة</p>
            <p className="text-[#006837] mt-2 text-sm">محمد الشهري</p>
          </div>
        </div>

        <div className="text-center pt-4 print:hidden">
          <button
            onClick={() => window.print()}
            className="bg-[#006837] hover:bg-[#00522b] text-white px-6 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow"
          >
            <Printer className="w-4 h-4" /> حفظ التقرير كـ PDF / طباعة
          </button>
        </div>
      </div>
    </div>
  );
};