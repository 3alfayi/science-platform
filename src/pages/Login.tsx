import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserCheck, ShieldCheck, AlertCircle } from 'lucide-react';

export const Login: React.FC<{ onLoginSuccess: () => void }> = ({ onLoginSuccess }) => {
  const [tab, setTab] = useState<'student' | 'teacher'>('student');
  const [nationalId, setNationalId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const { loginStudent, loginTeacher } = useAuth();

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!nationalId.trim()) {
      setErrorMsg('يرجى إدخال رقم الهوية الوطنية أو الإقامة');
      return;
    }
    setLoading(true);
    const res = await loginStudent(nationalId);
    setLoading(false);
    if (!res.success) {
      setErrorMsg(res.message || 'خطأ في عملية التحقق');
    } else {
      onLoginSuccess();
    }
  };

  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email || !password) {
      setErrorMsg('يرجى إدخال البيانات المعتمدة بشكل صحيح');
      return;
    }
    setLoading(true);
    const res = await loginTeacher(email, password);
    setLoading(false);
    if (res.error) {
      setErrorMsg('البيانات غير صحيحة، يرجى التأكد وإعادة المحاولة');
    } else {
      onLoginSuccess();
    }
  };

  return (
    <div className="max-w-md mx-auto my-6">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* الترويسة الخاصة بالبطاقة */}
        <div className="bg-[#006837] p-6 text-white text-center relative">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-white/20">
            <span className="text-2xl font-black">🏛️</span>
          </div>
          <h2 className="text-xl font-extrabold">منصة الأنشطة والواجبات</h2>
          <p className="text-emerald-100 text-xs mt-1 font-semibold">بوابة الدخول الموحدة للطلاب والمعلمين</p>
        </div>

        {/* التبويب المزدوج */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button
            onClick={() => { setTab('student'); setErrorMsg(''); }}
            className={`flex-1 py-3.5 font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              tab === 'student'
                ? 'bg-white text-[#006837] border-b-2 border-[#006837] shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            دخول الطالب (برقم الهوية)
          </button>
          <button
            onClick={() => { setTab('teacher'); setErrorMsg(''); }}
            className={`flex-1 py-3.5 font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              tab === 'teacher'
                ? 'bg-white text-[#006837] border-b-2 border-[#006837] shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            دخول المعلم
          </button>
        </div>

        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border-r-4 border-rose-600 text-rose-800 text-xs font-bold flex items-center gap-2 rounded-l">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {tab === 'student' ? (
            <form onSubmit={handleStudentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم الهوية الوطنية / السجل المدني
                </label>
                <input
                  type="text"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  placeholder="أدخل رقم الهوية المسجل بالمنصة..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#006837] focus:border-[#006837] transition-all outline-none font-semibold text-sm"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#006837] hover:bg-[#00522b] text-white font-bold py-3 rounded-xl shadow-md transition-colors disabled:opacity-50 text-sm"
              >
                {loading ? 'جاري التحقق...' : 'تسجيل الدخول للمنصة'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleTeacherSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  البريد الإلكتروني للمعلم
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#006837] focus:border-[#006837] transition-all outline-none font-semibold text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  كلمة المرور
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#006837] focus:border-[#006837] transition-all outline-none font-semibold text-sm"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow-md transition-colors disabled:opacity-50 text-sm"
              >
                {loading ? 'جاري التحقق...' : 'دخول لوحة التحكّم'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};