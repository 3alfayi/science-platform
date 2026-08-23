import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { AuthUser, Student } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  loginTeacher: (email: string, pass: string) => Promise<{ error: any }>;
  loginStudent: (nationalId: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // التحقق من جلسة الطالب المخزنة محلياً أو المعلم في Supabase Auth
    const savedStudent = localStorage.getItem('science_student');
    if (savedStudent) {
      setUser({ role: 'student', studentData: JSON.parse(savedStudent) });
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setUser({ role: 'teacher', teacherEmail: session.user.email });
      }
      setLoading(false);
    });
  }, []);

  // تسجيل دخول المعلم (Supabase Auth)
  const loginTeacher = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    if (!error && data.user) {
      localStorage.removeItem('science_student');
      setUser({ role: 'teacher', teacherEmail: data.user.email });
    }
    return { error };
  };

  // تسجيل دخول الطالب برقم الهوية
  const loginStudent = async (nationalId: string) => {
    const { data, error } = await supabase
      .from('students')
      .select('*, classes(*)')
      .eq('national_id', nationalId.trim())
      .single();

    if (error || !data) {
      return { success: false, message: 'رقم الهوية غير مسجل، يرجى مراجعة المعلم.' };
    }

    const studentObj: Student = data;
    localStorage.setItem('science_student', JSON.stringify(studentObj));
    await supabase.auth.signOut(); // إغلاق أي جلسة معلم قائمة
    setUser({ role: 'student', studentData: studentObj });
    return { success: true };
  };

  // تسجيل الخروج الشامل
  const logout = async () => {
    localStorage.removeItem('science_student');
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loginTeacher, loginStudent, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};