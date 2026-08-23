import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { TeacherDashboard } from './components/Teacher/TeacherDashboard';
import { StudentDashboard } from './components/Student/StudentDashboard';
import type { Student, Activity, Submission } from './types';
import { GraduationCap, UserCheck, Lock, LogOut, Printer } from 'lucide-react';

// 📌 1. مكون عرض تقرير مدير المدرسة المباشر من الرابط
const PrincipalReportView: React.FC<{ classIdParam: string | null }> = ({ classIdParam }) => {
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [submissionsList, setSubmissionsList] = useState<Submission[]>([]);
  const [className, setClassName] = useState<string>('جميع الصفوف');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReportData = async () => {
      setLoading(true);
      const { data: stData } = await supabase.from('students').select('*, classes(*)');
      const { data: subData } = await supabase.from('submissions').select('*');

      let filteredSt = stData || [];
      let cName = 'جميع الصفوف';

      if (classIdParam && classIdParam !== 'all') {
        filteredSt = filteredSt.filter((s) => s.class_id === classIdParam);
        const { data: cData } = await supabase.from('classes').select('name').eq('id', classIdParam).single();
        if (cData) cName = cData.name;
      }

      setStudentsList(filteredSt);
      setSubmissionsList(subData || []);
      setClassName(cName);
      setLoading(false);
    };

    loadReportData();
  }, [classIdParam]);

  const calcStudentBalanced = (stId: string) => {
    const stSubs = submissionsList.filter((s) => s.student_id === stId && s.score !== null && s.score !== undefined);
    if (stSubs.length === 0) return { score: 0, pct: 0 };

    let earned = 0;
    let max = 0;
    stSubs.forEach((s) => {
      earned += Number(s.score) || 0;
      max += Number((s as any).max_score) || 10;
    });

    const pct = max > 0 ? (earned / max) * 100 : 0;
    const score = ((pct / 100) * 30).toFixed(2);
    return { score: Number(score), pct: Number(pct.toFixed(1)) };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center font-bold text-slate-600">
        جاري تحميل تقرير مدير المدرسة...
      </div>
    );
  }

  let totalScores = 0;
  let excellentCount = 0;

  studentsList.forEach((st) => {
    const res = calcStudentBalanced(st.id);
    totalScores += res.score;
    if (res.pct >= 90) excellentCount++;
  });

  const avg = studentsList.length > 0 ? (totalScores / studentsList.length).toFixed(2) : 0;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans print:p-0 print:bg-white dir-rtl text-right">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border p-8 space-y-6 print:shadow-none print:border-none print:w-full">
        <div className="flex justify-between items-center border-b pb-4 print:hidden">
          <span className="text-xs font-bold text-slate-500">معاينة التقرير الخاص بإدارة المدرسة</span>
          <button
            onClick={() => window.print()}
            className="bg-[#006837] hover:bg-[#00522b] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" /> حفظ بتنسيق PDF / طباعة
          </button>
        </div>

        <div className="border-b-2 border-[#006837] pb-4 flex justify-between items-center text-center">
          <div className="text-right">
            <p className="text-xs font-bold">المملكة العربية السعودية</p>
            <p className="text-xs font-bold">وزارة التعليم</p>
            <p className="text-xs font-bold text-[#006837]">مدرسة أبو العاص بن الربيع ومتوسطة الربيع بن خثيم</p>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-black text-[#006837]">تقرير التحليل الرقمي الشامل لمادة العلوم</h2>
            <p className="text-xs font-semibold text-slate-500 mt-1">عام 1448 هـ - توقيت أم القرى</p>
          </div>
          <div className="text-left text-xs font-bold">
            <p>التاريخ: {new Date().toLocaleDateString('ar-SA')}</p>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border grid grid-cols-4 gap-4 text-center text-xs font-bold">
          <div>المستهدف: <span className="text-[#006837] block font-black text-sm">{className}</span></div>
          <div>عدد الطلاب: <span className="block font-black text-sm">{studentsList.length} طلاب</span></div>
          <div>متوسط الدرجات: <span className="block font-black text-sm text-[#006837]">{avg} / 30</span></div>
          <div>المتفوقون: <span className="block font-black text-sm text-emerald-600">{excellentCount} طلاب</span></div>
        </div>

        <div>
          <h4 className="font-extrabold text-sm text-slate-800 mb-3">تفاصيل درجات وإنجاز الطلاب:</h4>
          <table className="w-full text-right border-collapse text-xs border border-slate-200">
            <thead>
              <tr className="bg-[#006837] text-white font-bold">
                <th className="p-2 border border-slate-300 text-center">م</th>
                <th className="p-2 border border-slate-300">اسم الطالب</th>
                <th className="p-2 border border-slate-300">الصف الدراسي</th>
                <th className="p-2 border border-slate-300 text-center">المجموع الموزون (من 30)</th>
                <th className="p-2 border border-slate-300 text-center">التقدير المستحق</th>
              </tr>
            </thead>
            <tbody>
              {studentsList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-400">لا يوجد طلاب مسجلون حتى الآن</td>
                </tr>
              ) : (
                studentsList.map((st, i) => {
                  const res = calcStudentBalanced(st.id);
                  let evalText = 'ممتاز';
                  if (res.pct < 65) evalText = 'ضعيف / بحاجة لمتابعة';
                  else if (res.pct < 80) evalText = 'جيد';
                  else if (res.pct < 90) evalText = 'جيد جداً';

                  return (
                    <tr key={st.id} className="border-b border-slate-200">
                      <td className="p-2 border border-slate-200 text-center font-mono">{i + 1}</td>
                      <td className="p-2 border border-slate-200 font-bold">{st.full_name}</td>
                      <td className="p-2 border border-slate-200">{st.classes?.name || 'غير محدد'}</td>
                      <td className="p-2 border border-slate-200 text-center font-mono font-bold text-[#006837]">{res.score}</td>
                      <td className="p-2 border border-slate-200 text-center font-bold">
                        {evalText} ({res.pct}%)
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="pt-12 border-t flex justify-between items-center text-xs font-bold text-center">
          <div>
            <p>معلم المادة</p>
            <p className="text-[#006837] mt-3 text-sm">عبدالعزيز آل فايع</p>
          </div>
          <div>
            <p>مدير المدرسة</p>
            <p className="text-[#006837] mt-3 text-sm">محمد الشهري</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// 📌 2. مكون عرض تقرير ولي الأمر المباشر من الرابط
const StudentReportView: React.FC<{ studentId: string }> = ({ studentId }) => {
  const [studentData, setStudentData] = useState<Student | null>(null);
  const [activitiesList, setActivitiesList] = useState<Activity[]>([]);
  const [submissionsList, setSubmissionsList] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStudentData = async () => {
      setLoading(true);
      const { data: st } = await supabase
        .from('students')
        .select('*, classes(*)')
        .eq('id', studentId)
        .maybeSingle();

      if (st) {
        setStudentData(st);
        const { data: acts } = await supabase.from('activities').select('*').eq('class_id', st.class_id);
        const { data: subs } = await supabase.from('submissions').select('*').eq('student_id', st.id);
        setActivitiesList(acts || []);
        setSubmissionsList(subs || []);
      }
      setLoading(false);
    };

    loadStudentData();
  }, [studentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center font-bold text-slate-600">
        جاري تحميل تقرير الطالب...
      </div>
    );
  }

  if (!studentData) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center font-bold text-rose-600">
        عذراً، لم يتم العثور على بيانات الطالب المطلوبة.
      </div>
    );
  }

  // حساب الدرجة الموزونة
  let totalEarned = 0;
  let totalMax = 0;

  submissionsList.forEach((sub) => {
    if (sub.score !== null && sub.score !== undefined) {
      totalEarned += Number(sub.score) || 0;
      totalMax += Number((sub as any).max_score) || 10;
    }
  });

  const percentage = totalMax > 0 ? (totalEarned / totalMax) * 100 : 0;
  const balancedScore = ((percentage / 100) * 30).toFixed(2);

  let evalText = 'ممتاز';
  if (percentage < 65) evalText = 'بحاجة لمتابعة وتقوية';
  else if (percentage < 80) evalText = 'جيد';
  else if (percentage < 90) evalText = 'جيد جداً';

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans print:p-0 print:bg-white dir-rtl text-right">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl border p-8 space-y-6 print:shadow-none print:border-none print:w-full">
        <div className="flex justify-between items-center border-b pb-4 print:hidden">
          <span className="text-xs font-bold text-slate-500">تقرير ولي الأمر المباشر</span>
          <button
            onClick={() => window.print()}
            className="bg-[#006837] hover:bg-[#00522b] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" /> طباعة / حفظ بتنسيق PDF
          </button>
        </div>

        <div className="border-b-2 border-[#006837] pb-4 flex justify-between items-center text-center">
          <div className="text-right">
            <p className="text-xs font-bold">المملكة العربية السعودية</p>
            <p className="text-xs font-bold">وزارة التعليم</p>
            <p className="text-xs font-bold text-[#006837]">مدرسة أبو العاص بن الربيع ومتوسطة الربيع بن خثيم</p>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-black text-[#006837]">تقرير الأداء والتحليل الرقمي لمادة العلوم</h2>
            <p className="text-xs font-semibold text-slate-500 mt-1">عام 1448 هـ - توقيت أم القرى</p>
          </div>
          <div className="text-left text-xs font-bold">
            <p>التاريخ: {new Date().toLocaleDateString('ar-SA')}</p>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border grid grid-cols-3 gap-4 text-xs font-bold">
          <div>اسم الطالب: <span className="text-[#006837] font-black">{studentData.full_name}</span></div>
          <div>رقم الهوية: <span className="font-mono">{studentData.national_id}</span></div>
          <div>الصف الدراسي: <span>{studentData.classes?.name || 'غير محدد'}</span></div>
        </div>

        <div className="bg-emerald-50 border-2 border-[#006837] p-4 rounded-xl flex justify-between items-center">
          <div>
            <span className="text-xs font-extrabold text-[#006837] block">المجموع الموزون النهائي والتحليل الرقمي:</span>
            <span className="text-slate-600 text-xs font-extrabold mt-1 block">
              التقدير المستحق: <span className="text-[#006837] font-black">{evalText} ({percentage.toFixed(1)}%)</span>
            </span>
          </div>
          <div className="text-2xl font-black text-[#006837] font-mono">
            {balancedScore} / 30
          </div>
        </div>

        <div>
          <h4 className="font-extrabold text-sm text-slate-800 mb-3">تفاصيل الأنشطة المنجزة والدرجات المستحقة:</h4>
          <table className="w-full text-right border-collapse text-xs border border-slate-200">
            <thead>
              <tr className="bg-[#006837] text-white font-bold">
                <th className="p-2 border border-slate-300 text-center">م</th>
                <th className="p-2 border border-slate-300">عنوان النشاط</th>
                <th className="p-2 border border-slate-300 text-center">حالة التسليم</th>
                <th className="p-2 border border-slate-300 text-center">الدرجة المكتسبة</th>
              </tr>
            </thead>
            <tbody>
              {activitiesList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-slate-400">لا توجد أنشطة لهذا الصف حالياً</td>
                </tr>
              ) : (
                activitiesList.map((act, i) => {
                  const sub = submissionsList.find((s) => s.activity_id === act.id);
                  const maxS = (sub as any)?.max_score || 10;
                  return (
                    <tr key={act.id} className="border-b border-slate-200">
                      <td className="p-2 border border-slate-200 text-center font-mono">{i + 1}</td>
                      <td className="p-2 border border-slate-200 font-bold">{act.title}</td>
                      <td className="p-2 border border-slate-200 text-center">
                        {sub ? (
                          <span className="text-emerald-700 font-bold">✅ تم التسليم</span>
                        ) : (
                          <span className="text-rose-600 font-bold">❌ لم يتم التسليم</span>
                        )}
                      </td>
                      <td className="p-2 border border-slate-200 text-center font-bold">
                        {sub?.score !== null && sub?.score !== undefined ? `${sub.score} / ${maxS}` : sub ? 'قيد التصحيح' : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="pt-12 border-t flex justify-between items-center text-xs font-bold text-center">
          <div>
            <p>معلم المادة</p>
            <p className="text-[#006837] mt-3 text-sm">عبدالعزيز آل فايع</p>
          </div>
          <div>
            <p>مدير المدرسة</p>
            <p className="text-[#006837] mt-3 text-sm">محمد الشهري</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [role, setRole] = useState<'guest' | 'teacher' | 'student'>('guest');
  const [student, setStudent] = useState<Student | null>(null);
  
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [showTeacherLogin, setShowTeacherLogin] = useState(false);
  const [nationalIdInput, setNationalIdInput] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 🔴 فحص معلمات الرابط فورياً قبل تنفيذ المكون
  const urlParams = new URLSearchParams(window.location.search);
  const isGeneralReport = urlParams.get('general_report');
  const classIdParam = urlParams.get('class_id');
  const studentReportIdParam = urlParams.get('student_report_id');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setRole('teacher');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setRole('teacher');
      } else if (role === 'teacher') {
        setRole('guest');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherEmail.trim() || !teacherPassword.trim()) {
      setErrorMsg('يرجى كتابة البريد الإلكتروني وكلمة المرور كاملة');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: teacherEmail.trim(),
        password: teacherPassword,
      });

      setLoading(false);

      if (error || !data.session) {
        setErrorMsg('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      } else {
        setRole('teacher');
        setShowTeacherLogin(false);
        setErrorMsg('');
      }
    } catch (err) {
      setLoading(false);
      setErrorMsg('حدث خطأ أثناء الاتصال بالخدمة');
    }
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nationalIdInput.trim()) {
      setErrorMsg('يرجى إدخال رقم الهوية الوطنية');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    
    const { data, error } = await supabase
      .from('students')
      .select('*, classes(*)')
      .eq('national_id', nationalIdInput.trim())
      .maybeSingle();

    setLoading(false);
    if (error || !data) {
      setErrorMsg('رقم الهوية المدخل غير مسجل بالمنصة.');
    } else {
      setStudent(data);
      setRole('student');
      setErrorMsg('');
    }
  };

  const handleLogout = async () => {
    if (role === 'teacher') {
      await supabase.auth.signOut();
    }
    setRole('guest');
    setStudent(null);
  };

  // توجيه تلقائي لتقارير الروابط
  if (isGeneralReport) {
    return <PrincipalReportView classIdParam={classIdParam} />;
  }

  if (studentReportIdParam) {
    return <StudentReportView studentId={studentReportIdParam} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans dir-rtl text-right">
      <header className="bg-[#006837] text-white p-4 shadow-md sticky top-0 z-40 print:hidden">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-emerald-300" />
            <div>
              <h1 className="font-extrabold text-lg md:text-xl">منصة العلوم للأنشطة والواجبات التفاعلية</h1>
              <p className="text-xs text-emerald-200 font-semibold">
                مدرسة أبو العاص بن الربيع ومتوسطة الربيع بن خثيم | عام 1448 هـ - توقيت أم القرى
              </p>
            </div>
          </div>
          {role !== 'guest' && (
            <button
              onClick={handleLogout}
              className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> تسجيل الخروج
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6">
        {role === 'teacher' && <TeacherDashboard />}
        {role === 'student' && student && <StudentDashboard student={student} />}

        {role === 'guest' && (
          <div className="max-w-md mx-auto my-12 bg-white rounded-3xl shadow-xl border border-slate-200 p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-emerald-50 text-[#006837] rounded-full flex items-center justify-center mx-auto">
                <UserCheck className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-slate-800">بوابة الدخول للمنصة</h2>
              <p className="text-xs text-slate-500 font-bold">اختر صفة الدخول للمتابعة</p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold text-center border border-rose-200">
                {errorMsg}
              </div>
            )}

            {!showTeacherLogin ? (
              <div className="space-y-4">
                <form onSubmit={handleStudentLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">رقم الهوية الوطنية للطالب</label>
                    <input
                      type="text"
                      value={nationalIdInput}
                      onChange={(e) => setNationalIdInput(e.target.value)}
                      placeholder="أدخل رقم الهوية المسجلة..."
                      className="w-full p-3 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#006837]"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#006837] hover:bg-[#00522b] text-white py-3 rounded-xl font-extrabold text-sm transition-colors cursor-pointer"
                  >
                    {loading ? 'جاري التحقق...' : 'دخول الطالب'}
                  </button>
                </form>

                <div className="pt-4 border-t text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTeacherLogin(true);
                      setErrorMsg('');
                    }}
                    className="text-xs font-extrabold text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1 mx-auto cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" /> الدخول كمعلم
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleTeacherLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">البريد الإلكتروني للمعلم</label>
                  <input
                    type="email"
                    value={teacherEmail}
                    onChange={(e) => setTeacherEmail(e.target.value)}
                    placeholder="name@school.edu.sa"
                    className="w-full p-2.5 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#006837]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">كلمة المرور</label>
                  <input
                    type="password"
                    value={teacherPassword}
                    onChange={(e) => setTeacherPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور..."
                    className="w-full p-2.5 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#006837]"
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTeacherLogin(false);
                      setErrorMsg('');
                    }}
                    className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-2/3 bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    {loading ? 'جاري التحقق...' : 'دخول المعلم'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </main>

      <footer className="text-center py-4 text-xs font-bold text-slate-500 border-t bg-white mt-12 print:hidden">
        إشراف المعلم: <span className="text-[#006837]">عبدالعزيز آل فايع</span> | مدير المدرسة: <span className="text-[#006837]">محمد الشهري</span>
      </footer>
    </div>
  );
}