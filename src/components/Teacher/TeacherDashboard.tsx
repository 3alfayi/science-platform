import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { ClassItem, Student, Activity, Submission } from '../../types';
import {
  Plus,
  Trash2,
  MessageCircle,
  Users,
  BookOpen,
  FileUp,
  Award,
  Printer,
  X,
  Edit,
  Eye,
  Check,
  Calculator,
  Edit3,
  Save,
  GraduationCap,
  AlertTriangle,
  Briefcase,
  BarChart,
  TrendingUp,
  Clock,
  AlertCircle,
  Calendar,
  ClipboardList,
  FileSpreadsheet
} from 'lucide-react';

export const TeacherDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'grading' | 'students' | 'activities' | 'forms'>('grading');

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedActivity, setSelectedActivity] = useState<string>('all');

  const [targetMaxScore, setTargetMaxScore] = useState<number>(30);

  const [principalPhone, setPrincipalPhone] = useState<string>(() => localStorage.getItem('principalPhone') || '0500000000');
  const [counselorPhone, setCounselorPhone] = useState<string>(() => localStorage.getItem('counselorPhone') || '0500000000');
  const [isEditingPhones, setIsEditingPhones] = useState<boolean>(false);

  const [newClassName, setNewClassName] = useState('');

  // الإضافة الفردية
  const [studentAddMode, setStudentAddMode] = useState<'single' | 'paste' | 'file'>('single');
  const [fullName, setFullName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [studentClassId, setStudentClassId] = useState('');

  // الإضافة الجماعية
  const [bulkTextData, setBulkTextData] = useState('');
  const [bulkClassId, setBulkClassId] = useState('');
  const [bulkFile, setBulkFile] = useState<File | null>(null);

  const [actTitle, setActTitle] = useState('');
  const [actClassId, setActClassId] = useState('');
  const [actFile, setActFile] = useState<File | null>(null);
  const [startDate, setStartDate] = useState('');
  const [startTimeOnly, setStartTimeOnly] = useState('08:00');
  const [endDate, setEndDate] = useState('');
  const [endTimeOnly, setEndTimeOnly] = useState('23:59');

  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [editStartDate, setEditStartDate] = useState('');
  const [editStartTimeOnly, setEditStartTimeOnly] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editEndTimeOnly, setEditEndTimeOnly] = useState('');

  const [selectedStudentReport, setSelectedStudentReport] = useState<Student | null>(null);
  const [showGeneralReportModal, setShowGeneralReportModal] = useState<boolean>(false);
  const [viewSubmissionAnswers, setViewSubmissionAnswers] = useState<Submission | null>(null);

  const [editingScores, setEditingScores] = useState<Record<string, { score: any; maxScore: any }>>({});
  const [activeEditId, setActiveEditId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchClasses();
    fetchStudents();
    fetchActivities();
    fetchSubmissions();
  }, []);

  const handleSavePhones = () => {
    localStorage.setItem('principalPhone', principalPhone);
    localStorage.setItem('counselorPhone', counselorPhone);
    setIsEditingPhones(false);
    setMsg({ type: 'success', text: 'تم حفظ أرقام التواصل بنجاح!' });
  };

  const fetchClasses = async () => {
    const { data } = await supabase.from('classes').select('*').order('name');
    if (data) setClasses(data);
  };

  const fetchStudents = async () => {
    const { data } = await supabase.from('students').select('*, classes(*)').order('created_at', { ascending: false });
    if (data) setStudents(data);
  };

  const fetchActivities = async () => {
    const { data } = await supabase.from('activities').select('*, classes(*)').order('created_at', { ascending: false });
    if (data) setActivities(data);
  };

  const fetchSubmissions = async () => {
    const { data } = await supabase.from('submissions').select('*, students(*, classes(*)), activities(*)');
    if (data) {
      setSubmissions(data);
      const initialMap: Record<string, { score: any; maxScore: any }> = {};
      data.forEach((s) => {
        initialMap[s.id] = {
          score: s.score ?? '',
          maxScore: (s as any).max_score ?? 10,
        };
      });
      setEditingScores(initialMap);
    }
  };

  const splitISOToDateAndTime = (isoStr: string) => {
    if (!isoStr) return { date: '', time: '00:00' };
    const d = new Date(isoStr);
    const z = (n: number) => (n < 10 ? '0' : '') + n;
    return {
      date: `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`,
      time: `${z(d.getHours())}:${z(d.getMinutes())}`
    };
  };

  const openEditActivityModal = (act: Activity) => {
    setEditingActivity(act);
    const startObj = splitISOToDateAndTime(act.start_time);
    const endObj = splitISOToDateAndTime(act.end_time);
    setEditStartDate(startObj.date);
    setEditStartTimeOnly(startObj.time);
    setEditEndDate(endObj.date);
    setEditEndTimeOnly(endObj.time);
  };

  const getActivityTimeStatus = (endTimeStr: string) => {
    if (!endTimeStr) return 'active';
    const now = new Date().getTime();
    const end = new Date(endTimeStr).getTime();
    return now > end ? 'expired' : 'active';
  };

  const isSubmissionValid = (sub?: Submission) => {
    if (!sub) return false;
    if (sub.answers_data) {
      if (Array.isArray(sub.answers_data) && sub.answers_data.length > 0) return true;
      if (typeof sub.answers_data === 'object' && Object.keys(sub.answers_data).length > 0) return true;
    }
    return sub.submitted_at !== undefined && sub.submitted_at !== null;
  };

  const calculateStudentBalancedScore = (studentId: string, targetMax: number) => {
    const studentSubs = submissions.filter(
      (s) => s.student_id === studentId && s.score !== null && s.score !== undefined
    );

    if (studentSubs.length === 0) return { totalEarned: 0, totalMax: 0, balancedScore: 0, percentage: 0 };

    let totalEarned = 0;
    let totalMax = 0;

    studentSubs.forEach((sub) => {
      const earned = Number(sub.score) || 0;
      const max = Number((sub as any).max_score) || 10;
      totalEarned += earned;
      totalMax += max;
    });

    const percentage = totalMax > 0 ? (totalEarned / totalMax) * 100 : 0;
    const balancedScore = ((percentage / 100) * targetMax).toFixed(2);

    return { totalEarned, totalMax, balancedScore: Number(balancedScore), percentage: Number(percentage.toFixed(1)) };
  };

  const calculateGradeAnalytics = (targetClassId: string = 'all') => {
    const targetStudentsList = targetClassId === 'all' 
      ? students 
      : students.filter(s => s.class_id === targetClassId);

    if (targetStudentsList.length === 0) {
      return {
        avgScore: 0,
        maxScore: 0,
        minScore: 0,
        excellentCount: 0,
        veryGoodCount: 0,
        goodCount: 0,
        needsSupportCount: 0,
        completionRate: 0
      };
    }

    const scoresList: number[] = [];
    let totalExpectedSubs = 0;
    let totalActualSubs = 0;

    targetStudentsList.forEach((st) => {
      const scoreData = calculateStudentBalancedScore(st.id, targetMaxScore);
      scoresList.push(scoreData.balancedScore);

      const stActivities = targetClassId === 'all'
        ? activities.filter(a => a.class_id === st.class_id)
        : activities.filter(a => a.class_id === targetClassId);
      
      totalExpectedSubs += stActivities.length;
      const stSubs = submissions.filter(s => s.student_id === st.id);
      totalActualSubs += stSubs.length;
    });

    const sum = scoresList.reduce((acc, curr) => acc + curr, 0);
    const avgScore = (sum / scoresList.length).toFixed(2);
    const maxScore = Math.max(...scoresList, 0);
    const minScore = Math.min(...scoresList, 0);

    let excellentCount = 0;
    let veryGoodCount = 0;
    let goodCount = 0;
    let needsSupportCount = 0;

    scoresList.forEach((score) => {
      const pct = (score / targetMaxScore) * 100;
      if (pct >= 90) excellentCount++;
      else if (pct >= 80) veryGoodCount++;
      else if (pct >= 65) goodCount++;
      else needsSupportCount++;
    });

    const completionRate = totalExpectedSubs === 0 ? 0 : Math.round((totalActualSubs / totalExpectedSubs) * 100);

    return {
      avgScore: Number(avgScore),
      maxScore,
      minScore,
      excellentCount,
      veryGoodCount,
      goodCount,
      needsSupportCount,
      completionRate
    };
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    setLoading(true);
    const { error } = await supabase.from('classes').insert([{ name: newClassName.trim() }]);
    setLoading(false);
    if (error) {
      setMsg({ type: 'error', text: 'الصف موجود مسبقاً أو حدث خطأ أثناء الإضافة.' });
    } else {
      setMsg({ type: 'success', text: 'تمت إضافة الصف بنجاح!' });
      setNewClassName('');
      fetchClasses();
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!window.confirm('هل أنت تأكد من حذف هذا الصف؟ قد يتأثر الطلاب المقيدون به.')) return;
    const { error } = await supabase.from('classes').delete().eq('id', classId);
    if (!error) {
      setMsg({ type: 'success', text: 'تم حذف الصف بنجاح!' });
      fetchClasses();
      fetchStudents();
    }
  };

  // إضافة طالب فردي
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !nationalId || !studentClassId) {
      setMsg({ type: 'error', text: 'يرجى تعبئة كافة الحقول المطلوبة للطالب.' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('students').insert([
      {
        full_name: fullName.trim(),
        national_id: nationalId.trim(),
        class_id: studentClassId,
        parent_phone: parentPhone.trim() || null,
      },
    ]);
    setLoading(false);
    if (error) {
      setMsg({ type: 'error', text: 'رقم الهوية مستخدم مسبقاً أو توجد مشكلة بالبيانات.' });
    } else {
      setMsg({ type: 'success', text: 'تم تسجيل الطالب بنجاح!' });
      setFullName('');
      setNationalId('');
      setParentPhone('');
      fetchStudents();
    }
  };

  // إضافة جماعية عن طريق اللصق المباشر
  const handleBulkAddPaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkClassId || !bulkTextData.trim()) {
      setMsg({ type: 'error', text: 'يرجى اختيار الصف ولصق بيانات الطلاب.' });
      return;
    }

    setLoading(true);
    const lines = bulkTextData.trim().split('\n');
    const studentsToInsert: any[] = [];

    for (let line of lines) {
      if (!line.trim()) continue;
      // تقسيم السطر إما باستخدام Tab (من Excel) أو فاصلة أو مسافة
      const parts = line.split(/\t|,|;/).map((p) => p.trim());
      if (parts.length >= 2) {
        studentsToInsert.push({
          full_name: parts[0],
          national_id: parts[1],
          parent_phone: parts[2] || null,
          class_id: bulkClassId,
        });
      }
    }

    if (studentsToInsert.length === 0) {
      setLoading(false);
      setMsg({ type: 'error', text: 'تعذر التعرف على بيانات الطلاب، تأكد من التنسيق (الاسم ثم رقم الهوية).' });
      return;
    }

    const { error } = await supabase.from('students').insert(studentsToInsert);
    setLoading(false);

    if (error) {
      setMsg({ type: 'error', text: 'حدث خطأ أثناء الإضافة الجماعية، قد يكون بعض أرقام الهويات مكررة.' });
    } else {
      setMsg({ type: 'success', text: `تم استيراد وإضافة ${studentsToInsert.length} طالب بنجاح!` });
      setBulkTextData('');
      fetchStudents();
    }
  };

  // إضافة جماعية عن طريق قراءة ملف CSV
  const handleBulkAddFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkClassId || !bulkFile) {
      setMsg({ type: 'error', text: 'يرجى اختيار الصف وتحديد ملف CSV.' });
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (!content) {
        setLoading(false);
        setMsg({ type: 'error', text: 'الملف فارغ أو يتعذر قراءته.' });
        return;
      }

      const lines = content.split(/\r\n|\n/);
      const studentsToInsert: any[] = [];

      for (let line of lines) {
        if (!line.trim()) continue;
        const parts = line.split(/,|\t|;/).map((p) => p.trim().replace(/^"|"$/g, ''));
        // تجاوز ترويسة الجدول إن وجدت
        if (parts[0].includes('اسم') || parts[1]?.includes('هوية')) continue;
        
        if (parts.length >= 2) {
          studentsToInsert.push({
            full_name: parts[0],
            national_id: parts[1],
            parent_phone: parts[2] || null,
            class_id: bulkClassId,
          });
        }
      }

      if (studentsToInsert.length === 0) {
        setLoading(false);
        setMsg({ type: 'error', text: 'تعذر قراءة بيانات من الملف، تأكد من ترتيب الأعمدة.' });
        return;
      }

      const { error } = await supabase.from('students').insert(studentsToInsert);
      setLoading(false);

      if (error) {
        setMsg({ type: 'error', text: 'حدث خطأ أثناء الاستيراد من الملف، قد تكون بعض الهويات مكررة.' });
      } else {
        setMsg({ type: 'success', text: `تم استيراد وإضافة ${studentsToInsert.length} طالب بنجاح!` });
        setBulkFile(null);
        fetchStudents();
      }
    };
    reader.readAsText(bulkFile, 'UTF-8');
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actTitle || !actClassId || !actFile || !startDate || !startTimeOnly || !endDate || !endTimeOnly) {
      setMsg({ type: 'error', text: 'يرجى تعبئة كافة حقول النشاط وإرفاق ملف الـ PDF.' });
      return;
    }

    setLoading(true);
    const fileExt = actFile.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error: uploadErr } = await supabase.storage.from('activities_pdfs').upload(fileName, actFile);

    if (uploadErr) {
      setLoading(false);
      setMsg({ type: 'error', text: 'حدث خطأ أثناء رفع ملف الـ PDF.' });
      return;
    }

    const { data: publicUrlData } = supabase.storage.from('activities_pdfs').getPublicUrl(fileName);

    const fullStartISO = new Date(`${startDate}T${startTimeOnly}`).toISOString();
    const fullEndISO = new Date(`${endDate}T${endTimeOnly}`).toISOString();

    const { error: dbErr } = await supabase.from('activities').insert([
      {
        title: actTitle.trim(),
        class_id: actClassId,
        pdf_url: publicUrlData.publicUrl,
        start_time: fullStartISO,
        end_time: fullEndISO,
      },
    ]);

    setLoading(false);

    if (dbErr) {
      setMsg({ type: 'error', text: 'فشل حفظ بيانات النشاط.' });
    } else {
      setMsg({ type: 'success', text: 'تم نشر النشاط بنجاح للمرحلة المحددة!' });
      setActTitle('');
      setActFile(null);
      setStartDate('');
      setEndDate('');
      fetchActivities();
    }
  };

  const handleUpdateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingActivity) return;

    setLoading(true);
    const fullStartISO = new Date(`${editStartDate}T${editStartTimeOnly}`).toISOString();
    const fullEndISO = new Date(`${editEndDate}T${editEndTimeOnly}`).toISOString();

    const { error } = await supabase
      .from('activities')
      .update({
        title: editingActivity.title,
        class_id: editingActivity.class_id,
        start_time: fullStartISO,
        end_time: fullEndISO,
      })
      .eq('id', editingActivity.id);

    setLoading(false);

    if (!error) {
      setMsg({ type: 'success', text: 'تم تحديث بيانات النشاط بتوقيت أم القرى بنجاح!' });
      setEditingActivity(null);
      fetchActivities();
    } else {
      setMsg({ type: 'error', text: 'حدث خطأ أثناء تحديث بيانات النشاط.' });
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!window.confirm('هل أنت تأكد من حذف هذا النشاط نهائياً مع كافة تسليمات الطلاب؟')) return;
    const { error } = await supabase.from('activities').delete().eq('id', activityId);
    if (!error) {
      setMsg({ type: 'success', text: 'تم حذف النشاط بنجاح!' });
      fetchActivities();
      fetchSubmissions();
    }
  };

  const handleDeleteAllActivities = async () => {
    if (!window.confirm('⚠️ تحذير: هل أنت متأكد من حذف كــــافــة الأنشطة والواجبات؟')) return;
    setLoading(true);
    const { error } = await supabase.from('activities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    setLoading(false);
    if (!error) {
      setMsg({ type: 'success', text: 'تم مسح وحذف جميع الأنشطة بنجاح!' });
      fetchActivities();
      fetchSubmissions();
    }
  };

  const handleDeleteAllStudents = async () => {
    if (!window.confirm('⚠️ تحذير: هل أنت متأكد من حذف كــــافــة الطلاب المسجلين بالمنصة؟')) return;
    setLoading(true);
    const { error } = await supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    setLoading(false);
    if (!error) {
      setMsg({ type: 'success', text: 'تم مسح وحذف جميع بيانات الطلاب بنجاح!' });
      fetchStudents();
      fetchSubmissions();
    }
  };

  const handleSaveScore = async (studentId: string, activityId: string, subId?: string) => {
    const key = subId || `${studentId}_${activityId}`;
    const item = editingScores[key];
    const scoreToSave = Number(item?.score || 0);
    const maxScoreToSave = Number(item?.maxScore || 10);

    if (subId) {
      const { error } = await supabase
        .from('submissions')
        .update({
          score: scoreToSave,
          max_score: maxScoreToSave,
        })
        .eq('id', subId);

      if (!error) {
        setMsg({ type: 'success', text: 'تم تحديث الدرجة بنجاح!' });
        setActiveEditId(null);
        fetchSubmissions();
      }
    } else {
      const { error } = await supabase.from('submissions').insert([
        {
          student_id: studentId,
          activity_id: activityId,
          score: scoreToSave,
          max_score: maxScoreToSave,
          answers_data: [],
        },
      ]);

      if (!error) {
        setMsg({ type: 'success', text: 'تم رصد الدرجة بنجاح!' });
        setActiveEditId(null);
        fetchSubmissions();
      }
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!window.confirm('هل أنت تأكد من حذف هذا الطالب؟')) return;
    await supabase.from('students').delete().eq('id', id);
    fetchStudents();
  };

  const sendFullWhatsAppReport = (student: Student) => {
    if (!student.parent_phone) {
      alert('لا يوجد رقم جوال مسجل لولي الأمر.');
      return;
    }
    let phone = student.parent_phone.replace(/[^0-9]/g, '');
    if (phone.startsWith('05')) {
      phone = '966' + phone.substring(1);
    }

    const studentActivities = activities.filter((a) => a.class_id === student.class_id);
    const studentSubs = submissions.filter((s) => s.student_id === student.id);
    const scoreData = calculateStudentBalancedScore(student.id, targetMaxScore);
    const reportUrl = `${window.location.origin}/?student_report_id=${student.id}`;

    let reportDetails = `مكرم ولي أمر الطالب/ة السلام عليكم ورحمة الله وبركاته\n\n`;
    reportDetails += `مرفق لكم تقرير ابنكم *${student.full_name}* خلال الفترة الماضية في مادة العلوم.\n\n`;
    reportDetails += `🏫 *الصف الدراسي:* ${student.classes?.name || 'غير محدد'}\n`;
    reportDetails += `📊 *عدد الأنشطة المنجزة:* ${studentSubs.length} من أصل ${studentActivities.length}\n`;
    reportDetails += `🏆 *المجموع الكلي الموزون للأنشطة:* (${scoreData.balancedScore} من ${targetMaxScore})\n\n`;
    reportDetails += `📄 *استعراض وطباعة التقرير الإلكتروني (PDF):*\n${reportUrl}\n\n`;
    reportDetails += `معلم المادة: عبدالعزيز آل فايع\nمدير المدرسة: محمد الشهري`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(reportDetails)}`, '_blank');
  };

  const sendWhatsAppToCounselor = (student: Student) => {
    if (!counselorPhone) {
      alert('يرجى تحديد رقم جوال الموجه الطلابي في الخانة المخصصة بالطلب العلوي.');
      return;
    }

    let phone = counselorPhone.replace(/[^0-9]/g, '');
    if (phone.startsWith('05')) {
      phone = '966' + phone.substring(1);
    }

    const studentActivities = activities.filter((a) => a.class_id === student.class_id);
    const studentSubs = submissions.filter((s) => s.student_id === student.id);
    const uncompletedCount = studentActivities.length - studentSubs.length;
    const scoreData = calculateStudentBalancedScore(student.id, targetMaxScore);

    let counselorMsg = `سعادة الموجه الطلابي المحترم السلام عليكم ورحمة الله وبركاته\n\n`;
    counselorMsg += `أود إحاطتكم بتنبيه متابعة بشأن الطالب: *${student.full_name}*\n`;
    counselorMsg += `🏫 *الصف الدراسي:* ${student.classes?.name || 'غير محدد'}\n`;
    counselorMsg += `🆔 *رقم الهوية:* ${student.national_id}\n\n`;
    counselorMsg += `⚠️ *سبب الإحالة والمتابعة:*\n`;
    if (uncompletedCount > 0) {
      counselorMsg += `- عدم حل وتعدي الموعد النهائي لعدد (${uncompletedCount}) واجبات وأنشطة من أصل (${studentActivities.length}).\n`;
    }
    counselorMsg += `- المجموع الموزون الحالي للأنشطة: (${scoreData.balancedScore} من ${targetMaxScore}).\n\n`;
    counselorMsg += `نأمل التكرم بمتابعة حالة الطالب واستدعائه للوقوف على أسباب تدني المستوى الدراسي والإنجاز.\n\n`;
    counselorMsg += `معلم المادة: عبدالعزيز آل فايع\nمدير المدرسة: محمد الشهري`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(counselorMsg)}`, '_blank');
  };

  const sendReportToPrincipal = () => {
    if (!principalPhone) {
      alert('يرجى تحديد رقم جوال مدير المدرسة في الشريط العلوي.');
      return;
    }
    let phone = principalPhone.replace(/[^0-9]/g, '');
    if (phone.startsWith('05')) {
      phone = '966' + phone.substring(1);
    }

    const targetStudents = selectedClass === 'all' ? students : students.filter(s => s.class_id === selectedClass);
    const targetActivities = selectedClass === 'all' ? activities : activities.filter(a => a.class_id === selectedClass);
    const classNameLabel = selectedClass === 'all' ? 'جميع الصفوف' : classes.find(c => c.id === selectedClass)?.name || 'محدد';

    const analytics = calculateGradeAnalytics(selectedClass);
    const reportUrl = `${window.location.origin}/?general_report=true&class_id=${selectedClass}`;

    let msg = `سعادة مدير المدرسة الأستاذ / محمد الشهري،،\nالسلام عليكم ورحمة الله وبركاته..\n\n`;
    msg += `نرفع لسعادتكم التقرير التحليلي لدرجات وإنجاز الطلاب في مادة العلوم عبر (المنصة التفاعلية):\n\n`;
    msg += `📌 المستهدف: *${classNameLabel}*\n`;
    msg += `👥 عدد الطلاب: *${targetStudents.length} طلاب*\n`;
    msg += `📝 الأنشطة المطروحة: *${targetActivities.length} أنشطة*\n`;
    msg += `📈 نسبة التفاعل والإنجاز العامة: *${analytics.completionRate}%*\n\n`;
    msg += `📊 *تحليل الدرجات المستهدفة (من ${targetMaxScore}):*\n`;
    msg += `• متوسط درجات الطلاب: *${analytics.avgScore}*\n`;
    msg += `• أعلى درجة محققة: *${analytics.maxScore}*\n`;
    msg += `• أدنى درجة: *${analytics.minScore}*\n\n`;
    msg += `🏅 *توزيع التقديرات المستحقة:*\n`;
    msg += `• ممتاز (90% فأعلى): *${analytics.excellentCount} طلاب*\n`;
    msg += `• جيد جداً (80% - 89%): *${analytics.veryGoodCount} طلاب*\n`;
    msg += `• جيد (65% - 79%): *${analytics.goodCount} طلاب*\n`;
    msg += `• بحاجة لمتابعة وتقوية: *${analytics.needsSupportCount} طلاب*\n\n`;
    msg += `📄 *معاينة وطباعة التقرير الشامل المنسق (PDF):*\n${reportUrl}\n\n`;
    msg += `شاكرين لسعادتكم دعمكم المستمر للعملية التعليمية.\n\n`;
    msg += `معلم المادة: عبدالعزيز آل فايع`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const filteredStudents = selectedClass === 'all'
    ? students
    : students.filter((s) => s.class_id === selectedClass);

  const currentAnalytics = calculateGradeAnalytics(selectedClass);

  const sortedActivities = [...activities].sort((a, b) => 
    a.title.localeCompare(b.title, 'ar')
  );

  const fullGradingList: { student: Student; activity: Activity; submission?: Submission }[] = [];
  filteredStudents.forEach((st) => {
    let classActs = sortedActivities.filter((a) => a.class_id === st.class_id);
    
    if (selectedActivity !== 'all') {
      classActs = classActs.filter((a) => a.id === selectedActivity);
    }

    classActs.forEach((act) => {
      const sub = submissions.find((s) => s.student_id === st.id && s.activity_id === act.id);
      fullGradingList.push({ student: st, activity: act, submission: sub });
    });
  });

  return (
    <div className="space-y-6 print:m-0 print:p-0">
      {msg && (
        <div className="p-4 rounded-xl flex items-center justify-between font-bold text-sm bg-emerald-50 text-emerald-800 border border-emerald-200 print:hidden">
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)}>×</button>
        </div>
      )}

      {editingActivity && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                <Edit className="w-5 h-5 text-[#006837]" /> تعديل بيانات النشاط
              </h3>
              <button onClick={() => setEditingActivity(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateActivity} className="space-y-4 text-xs font-bold">
              <div>
                <label className="block text-slate-700 mb-1">عنوان النشاط</label>
                <input
                  type="text"
                  value={editingActivity.title}
                  onChange={(e) => setEditingActivity({ ...editingActivity, title: e.target.value })}
                  className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-[#006837]"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1">الصف المستهدف</label>
                <select
                  value={editingActivity.class_id || ''}
                  onChange={(e) => setEditingActivity({ ...editingActivity, class_id: e.target.value })}
                  className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-[#006837] bg-white"
                  required
                >
                  <option value="">اختر الصف...</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[#006837] font-extrabold flex items-center gap-1">
                  <Calendar className="w-4 h-4" /> موعد البداية (توقيت أم القرى)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-500 mb-1">التاريخ</label>
                    <input
                      type="date"
                      value={editStartDate}
                      onChange={(e) => setEditStartDate(e.target.value)}
                      className="w-full p-2 border rounded-lg bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">الوقت</label>
                    <input
                      type="time"
                      value={editStartTimeOnly}
                      onChange={(e) => setEditStartTimeOnly(e.target.value)}
                      className="w-full p-2 border rounded-lg bg-white font-mono"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <span className="text-rose-700 font-extrabold flex items-center gap-1">
                  <Clock className="w-4 h-4" /> موعد النهاية (توقيت أم القرى)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-500 mb-1">التاريخ</label>
                    <input
                      type="date"
                      value={editEndDate}
                      onChange={(e) => setEditEndDate(e.target.value)}
                      className="w-full p-2 border rounded-lg bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">الوقت</label>
                    <input
                      type="time"
                      value={editEndTimeOnly}
                      onChange={(e) => setEditEndTimeOnly(e.target.value)}
                      className="w-full p-2 border rounded-lg bg-white font-mono"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingActivity(null)}
                  className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-2/3 bg-[#006837] hover:bg-[#00522b] text-white py-2.5 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewSubmissionAnswers && (() => {
        const targetAct = activities.find((a) => a.id === viewSubmissionAnswers.activity_id);
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
            <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-4xl w-full space-y-4 max-h-[92vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="font-extrabold text-[#006837] text-xl">
                    ورقة إجابة الطالب: {viewSubmissionAnswers.students?.full_name || 'طالب'}
                  </h3>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">
                    النشاط: {targetAct?.title || 'عنوان النشاط'} | الصف: {viewSubmissionAnswers.students?.classes?.name || 'الصف'}
                  </p>
                </div>
                <button onClick={() => setViewSubmissionAnswers(null)} className="p-1 bg-slate-100 rounded-lg hover:bg-slate-200">
                  <X className="w-6 h-6 text-slate-500" />
                </button>
              </div>

              <div className="p-4 bg-slate-700 overflow-auto flex justify-center border-2 border-slate-200 rounded-xl">
                <div className="relative bg-white shadow-2xl rounded overflow-hidden min-w-[750px] min-h-[1000px]">
                  {targetAct?.pdf_url ? (
                    <iframe
                      src={`${targetAct.pdf_url}#toolbar=0&navpanes=0`}
                      title="Student Overlay PDF"
                      className="w-[750px] h-[1050px] pointer-events-none"
                    />
                  ) : (
                    <div className="p-10 text-center text-slate-500">جاري تحميل ملف النشاط...</div>
                  )}

                  {Array.isArray(viewSubmissionAnswers.answers_data) &&
                    viewSubmissionAnswers.answers_data.map((ann: any, i: number) => (
                      <div
                        key={i}
                        style={{
                          left: typeof ann.x === 'number' && ann.x <= 100 ? `${ann.x}%` : `${ann.x}px`,
                          top: typeof ann.y === 'number' && ann.y <= 100 ? `${ann.y}%` : `${ann.y}px`
                        }}
                        className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                      >
                        {ann.type === 'text' && (
                          <div className="bg-emerald-100/95 text-[#006837] font-extrabold text-xs px-2.5 py-1 rounded border-2 border-[#006837] shadow-lg">
                            {ann.text}
                          </div>
                        )}
                        {ann.type === 'check' && (
                          <div className="flex items-center justify-center bg-emerald-100 border-2 border-emerald-600 text-emerald-800 rounded-full p-1 shadow-lg">
                            <Check className="w-5 h-5 font-black" />
                          </div>
                        )}
                        {ann.type === 'cross' && (
                          <div className="flex items-center justify-center bg-rose-100 border-2 border-rose-600 text-rose-800 rounded-full p-1 shadow-lg">
                            <X className="w-5 h-5 font-black" />
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {showGeneralReportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:inset-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden print:shadow-none print:border-none print:w-full print:max-w-none">
            <div className="bg-slate-100 p-4 border-b flex justify-between items-center print:hidden">
              <h3 className="font-bold text-slate-800">التقرير التحليلي الشامل والإحصائي للمادة</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-[#006837] hover:bg-[#00522b] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> طباعة / تصدير PDF
                </button>
                <button
                  onClick={() => setShowGeneralReportModal(false)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 p-2 rounded-xl text-xs font-bold cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6 text-slate-800 font-sans print:p-6 print:m-0">
              <div className="border-b-2 border-[#006837] pb-4 flex justify-between items-center text-center">
                <div className="text-right">
                  <p className="text-xs font-bold">المملكة العربية السعودية</p>
                  <p className="text-xs font-bold">وزارة التعليم</p>
                  <p className="text-xs font-bold text-[#006837]">مدرسة أبو العاص بن الربيع ومتوسطة الربيع بن خثيم</p>
                </div>
                <div className="text-center">
                  <h2 className="text-xl font-black text-[#006837]">تقرير التحليل الرقمي العام والأداء الشامل</h2>
                  <p className="text-xs font-semibold text-slate-500 mt-1">عام 1448 هـ - توقيت أم القرى</p>
                </div>
                <div className="text-left text-xs font-bold">
                  <p>التاريخ: {new Date().toLocaleDateString('ar-SA')}</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 text-center text-xs font-bold">
                <div className="p-3 bg-slate-50 border rounded-xl">
                  <p className="text-slate-500">متوسط الدرجات</p>
                  <p className="text-lg font-black text-[#006837] mt-1">{currentAnalytics.avgScore} / {targetMaxScore}</p>
                </div>
                <div className="p-3 bg-slate-50 border rounded-xl">
                  <p className="text-slate-500">أعلى / أدنى درجة</p>
                  <p className="text-lg font-black text-slate-800 mt-1">{currentAnalytics.maxScore} / {currentAnalytics.minScore}</p>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <p className="text-emerald-800">نسبة التفاعل العامة</p>
                  <p className="text-lg font-black text-[#006837] mt-1">{currentAnalytics.completionRate}%</p>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-amber-800">المكلفون بالمتابعة</p>
                  <p className="text-lg font-black text-amber-700 mt-1">{currentAnalytics.needsSupportCount} طلاب</p>
                </div>
              </div>

              <div>
                <h4 className="font-extrabold text-sm text-slate-800 mb-3">كشف الدرجات والمجموع الموزون للطلاب:</h4>
                <table className="w-full text-right border-collapse text-xs border border-slate-200">
                  <thead>
                    <tr className="bg-[#006837] text-white font-bold">
                      <th className="p-2 border border-slate-300 text-center">م</th>
                      <th className="p-2 border border-slate-300">اسم الطالب</th>
                      <th className="p-2 border border-slate-300">الصف الدراسي</th>
                      <th className="p-2 border border-slate-300 text-center">المجموع الموزون (من {targetMaxScore})</th>
                      <th className="p-2 border border-slate-300 text-center">النسبة والتقدير المستحق</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((st, i) => {
                      const scoreData = calculateStudentBalancedScore(st.id, targetMaxScore);
                      let evalText = 'ممتاز';
                      if (scoreData.percentage < 65) evalText = 'ضعيف / بحاجة لمتابعة';
                      else if (scoreData.percentage < 80) evalText = 'جيد';
                      else if (scoreData.percentage < 90) evalText = 'جيد جداً';

                      return (
                        <tr key={st.id} className="border-b border-slate-200">
                          <td className="p-2 border border-slate-200 text-center font-mono">{i + 1}</td>
                          <td className="p-2 border border-slate-200 font-bold">{st.full_name}</td>
                          <td className="p-2 border border-slate-200">{st.classes?.name || 'غير محدد'}</td>
                          <td className="p-2 border border-slate-200 text-center font-mono font-bold text-[#006837]">{scoreData.balancedScore}</td>
                          <td className="p-2 border border-slate-200 text-center font-bold">
                            {evalText} ({scoreData.percentage}%)
                          </td>
                        </tr>
                      );
                    })}
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
        </div>
      )}

      {selectedStudentReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:inset-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden print:shadow-none print:border-none print:w-full print:max-w-none">
            <div className="bg-slate-100 p-4 border-b flex justify-between items-center print:hidden">
              <h3 className="font-bold text-slate-800">معاينة التقرير المطبوع الموزون التحليلي</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-[#006837] hover:bg-[#00522b] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> حفظ بتنسيق PDF / طباعة
                </button>
                <button
                  onClick={() => setSelectedStudentReport(null)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 p-2 rounded-xl text-xs font-bold cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6 text-slate-800 font-sans print:p-6 print:m-0">
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

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-3 gap-4 text-xs font-bold print:bg-slate-50">
                <div>اسم الطالب: <span className="text-[#006837] font-black">{selectedStudentReport.full_name}</span></div>
                <div>رقم الهوية: <span className="font-mono">{selectedStudentReport.national_id}</span></div>
                <div>الصف الدراسي: <span>{selectedStudentReport.classes?.name || 'غير محدد'}</span></div>
              </div>

              {(() => {
                const scoreData = calculateStudentBalancedScore(selectedStudentReport.id, targetMaxScore);
                let evalText = 'ممتاز';
                if (scoreData.percentage < 65) evalText = 'بحاجة لمتابعة وتقوية';
                else if (scoreData.percentage < 80) evalText = 'جيد';
                else if (scoreData.percentage < 90) evalText = 'جيد جداً';

                return (
                  <div className="bg-emerald-50 border-2 border-[#006837] p-4 rounded-xl flex justify-between items-center">
                    <div>
                      <span className="text-xs font-extrabold text-[#006837] block">المجموع الموزون النهائي والتحليل الرقمي:</span>
                      <span className="text-slate-600 text-xs font-extrabold mt-1 block">
                        التقدير التقديري المستحق: <span className="text-[#006837] font-black">{evalText} ({scoreData.percentage}%)</span>
                      </span>
                    </div>
                    <div className="text-2xl font-black text-[#006837] font-mono">
                      {scoreData.balancedScore} / {targetMaxScore}
                    </div>
                  </div>
                );
              })()}

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
                    {sortedActivities
                      .filter((a) => a.class_id === selectedStudentReport.class_id)
                      .map((act, i) => {
                        const sub = submissions.find(
                          (s) => s.student_id === selectedStudentReport.id && s.activity_id === act.id
                        );
                        const isExpired = getActivityTimeStatus(act.end_time) === 'expired';
                        const maxS = (sub as any)?.max_score || 10;
                        const hasSubmitted = isSubmissionValid(sub);

                        return (
                          <tr key={act.id} className="border-b border-slate-200">
                            <td className="p-2 border border-slate-200 text-center font-mono">{i + 1}</td>
                            <td className="p-2 border border-slate-200 font-bold">{act.title}</td>
                            <td className="p-2 border border-slate-200 text-center">
                              {hasSubmitted ? (
                                <span className="text-emerald-700 font-bold">✅ تم التسليم</span>
                              ) : isExpired ? (
                                <span className="text-rose-600 font-bold">⏰ انتهى الوقت ولم يتم التسليم</span>
                              ) : (
                                <span className="text-amber-600 font-bold">⏳ لم يتم الحل إلى الآن</span>
                              )}
                            </td>
                            <td className="p-2 border border-slate-200 text-center font-bold">
                              {sub?.score !== null && sub?.score !== undefined ? `${sub.score} / ${maxS}` : sub ? 'قيد التصحيح' : '0 / 10'}
                            </td>
                          </tr>
                        );
                      })}
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
        </div>
      )}

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 w-full md:w-auto overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('grading')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'grading'
                ? 'bg-[#006837] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Award className="w-4 h-4" /> رصد التصحيح الشامل ({fullGradingList.length})
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'students'
                ? 'bg-[#006837] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <GraduationCap className="w-4 h-4" /> قائمة الطلاب والمجموع ({students.length})
          </button>
          <button
            onClick={() => setActiveTab('activities')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'activities'
                ? 'bg-[#006837] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <FileUp className="w-4 h-4" /> الأنشطة المنشورة ({activities.length})
          </button>
          <button
            onClick={() => setActiveTab('forms')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'forms'
                ? 'bg-[#006837] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Plus className="w-4 h-4" /> إدخال وإضافة
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-blue-50 text-blue-900 border border-blue-200 px-3 py-1.5 rounded-xl text-xs font-bold">
            <Briefcase className="w-4 h-4 text-blue-600" />
            <span>المدير:</span>
            {isEditingPhones ? (
              <input
                type="text"
                value={principalPhone}
                onChange={(e) => setPrincipalPhone(e.target.value)}
                placeholder="05xxxxxxxx"
                className="w-24 px-1.5 py-0.5 bg-white border border-blue-300 text-slate-900 font-mono text-center rounded outline-none"
              />
            ) : (
              <span className="font-mono text-slate-800">{principalPhone}</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>الموجه:</span>
            {isEditingPhones ? (
              <input
                type="text"
                value={counselorPhone}
                onChange={(e) => setCounselorPhone(e.target.value)}
                placeholder="05xxxxxxxx"
                className="w-24 px-1.5 py-0.5 bg-white border border-amber-300 text-slate-900 font-mono text-center rounded outline-none"
              />
            ) : (
              <span className="font-mono text-slate-800">{counselorPhone}</span>
            )}
          </div>

          {isEditingPhones ? (
            <button
              onClick={handleSavePhones}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
            >
              <Save className="w-3.5 h-3.5" /> حفظ الأرقام
            </button>
          ) : (
            <button
              onClick={() => setIsEditingPhones(true)}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" /> تعديل الأرقام
            </button>
          )}

          <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-xl text-xs font-bold">
            <Calculator className="w-4 h-4 text-emerald-400" />
            <span>المجموع من:</span>
            <input
              type="number"
              value={targetMaxScore}
              onChange={(e) => setTargetMaxScore(Number(e.target.value) || 30)}
              className="w-12 px-1 py-0.5 bg-white text-slate-900 font-black text-center rounded outline-none"
            />
            <span className="text-emerald-400">درجة</span>
          </div>
        </div>
      </div>

      <div className="print:hidden">
        {activeTab === 'grading' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h3 className="font-bold text-slate-800 text-xl flex items-center gap-2">
                <Award className="w-5 h-5 text-[#006837]" /> رصد التصحيح وحالة الوقت الاحترافية
              </h3>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-600">تصفية الصف:</span>
                  <select
                    value={selectedClass}
                    onChange={(e) => {
                      setSelectedClass(e.target.value);
                      setSelectedActivity('all');
                    }}
                    className="px-3 py-1.5 border rounded-lg bg-slate-50 font-semibold text-sm outline-none"
                  >
                    <option value="all">جميع الصفوف</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-600">تصفية النشاط:</span>
                  <select
                    value={selectedActivity}
                    onChange={(e) => setSelectedActivity(e.target.value)}
                    className="px-3 py-1.5 border rounded-lg bg-slate-50 font-semibold text-sm outline-none"
                  >
                    <option value="all">جميع الأنشطة</option>
                    {sortedActivities
                      .filter((a) => selectedClass === 'all' || a.class_id === selectedClass)
                      .map((act) => (
                        <option key={act.id} value={act.id}>{act.title}</option>
                      ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-slate-50 text-slate-600 text-xs font-bold border-b">
                  <tr>
                    <th className="p-4">اسم الطالب</th>
                    <th className="p-4">النشاط</th>
                    <th className="p-4 text-center">حالة الوقت وحل الطالب</th>
                    <th className="p-4">رصد الدرجة المكتسبة / الكلية</th>
                    <th className="p-4 text-center">الإجراءات والتنبيهات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-semibold">
                  {fullGradingList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">لا توجد أنشطة مطروحة للطلاب المسجلين حالياً بحسب الفلترة المحددة</td>
                    </tr>
                  ) : (
                    fullGradingList.map(({ student: st, activity: act, submission: sub }) => {
                      const itemKey = sub?.id || `${st.id}_${act.id}`;
                      const isGraded = sub?.score !== null && sub?.score !== undefined;
                      const isEditing = activeEditId === itemKey || (!isGraded && !!sub);

                      const currentScore = editingScores[itemKey]?.score ?? sub?.score ?? '';
                      const currentMax = editingScores[itemKey]?.maxScore ?? (sub as any)?.max_score ?? 10;
                      
                      const timeStatus = getActivityTimeStatus(act.end_time);
                      const hasSubmitted = isSubmissionValid(sub);

                      return (
                        <tr key={itemKey} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-bold text-slate-800">{st.full_name}</td>
                          <td className="p-4 text-[#006837] font-bold">{act.title}</td>
                          <td className="p-4 text-center">
                            {hasSubmitted ? (
                              <button
                                onClick={() => setViewSubmissionAnswers(sub!)}
                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#006837] border border-emerald-200 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" /> ✅ تم التسليم (عرض الورقة)
                              </button>
                            ) : timeStatus === 'expired' ? (
                              <span className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold inline-flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" /> ⏰ انتهى الوقت ولم يتم التسليم
                              </span>
                            ) : (
                              <span className="px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold inline-flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" /> ⏳ لم يتم الحل إلى الآن
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            {isEditing ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  placeholder="الدرجة"
                                  value={currentScore}
                                  onChange={(e) =>
                                    setEditingScores({
                                      ...editingScores,
                                      [itemKey]: { ...editingScores[itemKey], score: e.target.value },
                                    })
                                  }
                                  className="w-16 px-2 py-1 border rounded-lg text-center font-bold outline-none focus:ring-2 focus:ring-[#006837]"
                                />
                                <span className="font-extrabold text-slate-400">من</span>
                                <input
                                  type="number"
                                  placeholder="الكلية"
                                  value={currentMax}
                                  onChange={(e) =>
                                    setEditingScores({
                                      ...editingScores,
                                      [itemKey]: { ...editingScores[itemKey], maxScore: e.target.value },
                                    })
                                  }
                                  className="w-16 px-2 py-1 border bg-slate-50 rounded-lg text-center font-bold outline-none focus:ring-2 focus:ring-[#006837]"
                                />
                                <button
                                  onClick={() => handleSaveScore(st.id, act.id, sub?.id)}
                                  className="bg-[#006837] hover:bg-[#00522b] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1 cursor-pointer"
                                >
                                  <Save className="w-3.5 h-3.5" /> حفظ
                                </button>
                              </div>
                            ) : sub ? (
                              <div className="flex items-center gap-3">
                                <span className="px-3 py-1 bg-emerald-50 text-[#006837] border border-emerald-200 font-black rounded-lg text-sm">
                                  {sub.score} / {(sub as any)?.max_score || 10}
                                </span>
                                <button
                                  onClick={() => setActiveEditId(itemKey)}
                                  className="text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" /> تعديل
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setActiveEditId(itemKey)}
                                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" /> رصد درجة يدوياً
                              </button>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => sendFullWhatsAppReport(st)}
                                className="p-2 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                                title="تقرير ولي الأمر"
                              >
                                <MessageCircle className="w-4 h-4" /> ولي الأمر
                              </button>
                              <button
                                onClick={() => sendWhatsAppToCounselor(st)}
                                className="p-2 bg-amber-100 text-amber-900 hover:bg-amber-200 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                                title="إشعار الموجه الطلابي"
                              >
                                <AlertTriangle className="w-4 h-4 text-amber-700" /> تنبيه الموجه
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold text-slate-500">متوسط الدرجات</p>
                  <p className="text-2xl font-black text-[#006837] mt-1 font-mono">{currentAnalytics.avgScore} <span className="text-xs text-slate-400">/ {targetMaxScore}</span></p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl text-[#006837]">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold text-slate-500">أعلى / أدنى درجة</p>
                  <p className="text-xl font-black text-slate-800 mt-1 font-mono">{currentAnalytics.maxScore} <span className="text-slate-400 text-xs">/ {currentAnalytics.minScore}</span></p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                  <BarChart className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold text-slate-500">الطلاب المتفوقون</p>
                  <p className="text-2xl font-black text-emerald-600 mt-1 font-mono">{currentAnalytics.excellentCount} <span className="text-xs text-slate-400">طلاب</span></p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-xl text-emerald-800">
                  <Award className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold text-slate-500">بحاجة لمتابعة</p>
                  <p className="text-2xl font-black text-rose-600 mt-1 font-mono">{currentAnalytics.needsSupportCount} <span className="text-xs text-slate-400">طلاب</span></p>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-slate-800 text-xl">قائمة الطلاب والمجموع الموزون ({filteredStudents.length})</h3>
                  {students.length > 0 && (
                    <button
                      onClick={handleDeleteAllStudents}
                      className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> مسح وحذف كافة الطلاب
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setShowGeneralReportModal(true)}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4" /> طباعة التقرير العام
                  </button>

                  <button
                    onClick={sendReportToPrincipal}
                    className="px-3.5 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-200 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <BarChart className="w-4 h-4" /> تقرير تحليلي للمدير
                  </button>

                  <span className="text-sm font-semibold text-slate-600 mr-2">تصفية:</span>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="px-3 py-1.5 border rounded-lg bg-slate-50 font-semibold text-sm outline-none"
                  >
                    <option value="all">جميع الصفوف</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-slate-50 text-slate-600 text-sm font-bold border-b">
                    <tr>
                      <th className="p-4">اسم الطالب</th>
                      <th className="p-4">رقم الهوية</th>
                      <th className="p-4">الصف الدراسي</th>
                      <th className="p-4 text-center">المجموع الموزون والتحليل (من {targetMaxScore})</th>
                      <th className="p-4 text-center">الإجراءات والتنبيهات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400">لا يوجد طلاب مسجلون حالياً</td>
                      </tr>
                    ) : (
                      filteredStudents.map((s) => {
                        const scoreData = calculateStudentBalancedScore(s.id, targetMaxScore);

                        return (
                          <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-4 font-bold text-slate-800">{s.full_name}</td>
                            <td className="p-4 font-mono text-slate-600">{s.national_id}</td>
                            <td className="p-4">
                              <span className="px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full font-bold text-xs">
                                {s.classes?.name || 'غير محدد'}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <div className="inline-flex items-center gap-2">
                                <span className="px-3 py-1 bg-slate-900 text-emerald-400 font-mono font-black rounded-lg text-sm shadow-sm">
                                  {scoreData.balancedScore} / {targetMaxScore}
                                </span>
                                <span className="text-xs font-extrabold text-slate-500">({scoreData.percentage}%)</span>
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex justify-center gap-2">
                                <button
                                  onClick={() => setSelectedStudentReport(s)}
                                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <Printer className="w-3.5 h-3.5" /> طباعة تقرير
                                </button>
                                <button
                                  onClick={() => sendFullWhatsAppReport(s)}
                                  className="px-3 py-1.5 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded-lg font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" /> ولي الأمر
                                </button>
                                <button
                                  onClick={() => sendWhatsAppToCounselor(s)}
                                  className="px-3 py-1.5 bg-amber-100 text-amber-900 hover:bg-amber-200 rounded-lg font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700" /> إشعار الموجه
                                </button>
                                <button
                                  onClick={() => handleDeleteStudent(s.id)}
                                  className="p-1.5 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activities' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-slate-800 text-xl flex items-center gap-2">
                  <FileUp className="w-5 h-5 text-[#006837]" /> إدارة الأنشطة والواجبات المنشورة ({sortedActivities.length})
                </h3>
                {sortedActivities.length > 0 && (
                  <button
                    onClick={handleDeleteAllActivities}
                    className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> مسح وحذف كافة الأنشطة
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-slate-50 text-slate-600 text-xs font-bold border-b">
                  <tr>
                    <th className="p-4">عنوان النشاط</th>
                    <th className="p-4">الصف المستهدف</th>
                    <th className="p-4">وقت البداية (توقيت أم القرى)</th>
                    <th className="p-4">وقت النهاية (توقيت أم القرى)</th>
                    <th className="p-4 text-center font-bold">حالة الوقت الحالية</th>
                    <th className="p-4 text-center">التحكم والإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-semibold">
                  {sortedActivities.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">لا توجد أنشطة منشورة حتى الآن</td>
                    </tr>
                  ) : (
                    sortedActivities.map((act) => {
                      const timeStatus = getActivityTimeStatus(act.end_time);
                      return (
                        <tr key={act.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-extrabold text-[#006837]">{act.title}</td>
                          <td className="p-4">
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-bold">
                              {act.classes?.name || 'جميع الصفوف'}
                            </span>
                          </td>
                          <td className="p-4 text-xs font-mono text-slate-600">
                            {new Date(act.start_time).toLocaleString('ar-SA')}
                          </td>
                          <td className="p-4 text-xs font-mono text-slate-600">
                            {new Date(act.end_time).toLocaleString('ar-SA')}
                          </td>
                          <td className="p-4 text-center">
                            {timeStatus === 'expired' ? (
                              <span className="px-3 py-1 bg-rose-100 text-rose-800 border border-rose-200 rounded-full text-xs font-extrabold inline-flex items-center gap-1">
                                ⏰ منتهي
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full text-xs font-extrabold inline-flex items-center gap-1">
                                🟢 نشط ومتاح
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => openEditActivityModal(act)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Edit className="w-4 h-4 text-[#006837]" /> تعديل
                              </button>
                              <button
                                onClick={() => handleDeleteActivity(act.id)}
                                className="p-1.5 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'forms' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 font-bold text-slate-800 text-lg mb-4">
                  <BookOpen className="w-5 h-5 text-[#006837]" />
                  <h3>إضافة صف جديد</h3>
                </div>
                <form onSubmit={handleAddClass} className="space-y-3">
                  <input
                    type="text"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="مثال: الصف الرابع الابتدائي"
                    className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-[#006837] text-sm font-semibold"
                    required
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#006837] hover:bg-[#00522b] text-white font-bold py-2 rounded-xl transition-colors text-sm cursor-pointer"
                  >
                    حفظ الصف
                  </button>
                </form>
              </div>

              {/* 🟢 كارت تسجيل الطلاب الفردي والجماعي المُحدّث */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between font-bold text-slate-800 text-lg mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#006837]" />
                    <h3>تسجيل الطلاب</h3>
                  </div>
                </div>

                {/* شريط خيارات الإضافة (فردي / لصق Excel / ملف CSV) */}
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-4 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setStudentAddMode('single')}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      studentAddMode === 'single'
                        ? 'bg-white text-[#006837] shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    فردي
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentAddMode('paste')}
                    className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
                      studentAddMode === 'paste'
                        ? 'bg-white text-[#006837] shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <ClipboardList className="w-3.5 h-3.5" /> لصق متعدد
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentAddMode('file')}
                    className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
                      studentAddMode === 'file'
                        ? 'bg-white text-[#006837] shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> ملف Excel
                  </button>
                </div>

                {/* 1. نموذج الإضافة الفردية */}
                {studentAddMode === 'single' && (
                  <form onSubmit={handleAddStudent} className="space-y-3">
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="اسم الطالب الثلاثي"
                      className="w-full px-3 py-1.5 border rounded-xl outline-none focus:ring-2 focus:ring-[#006837] text-sm font-semibold"
                      required
                    />
                    <input
                      type="text"
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value)}
                      placeholder="رقم الهوية الوطنية"
                      className="w-full px-3 py-1.5 border rounded-xl outline-none focus:ring-2 focus:ring-[#006837] text-sm font-semibold"
                      required
                    />
                    <select
                      value={studentClassId}
                      onChange={(e) => setStudentClassId(e.target.value)}
                      className="w-full px-3 py-1.5 border rounded-xl outline-none focus:ring-2 focus:ring-[#006837] bg-white text-sm font-semibold"
                      required
                    >
                      <option value="">اختر الصف...</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      placeholder="جوال ولي الأمر (05xxxxxxxx)"
                      className="w-full px-3 py-1.5 border rounded-xl outline-none focus:ring-2 focus:ring-[#006837] text-sm font-semibold"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-xl transition-colors text-sm cursor-pointer"
                    >
                      حفظ الطالب
                    </button>
                  </form>
                )}

                {/* 2. نموذج الإضافة باللصق المباشر */}
                {studentAddMode === 'paste' && (
                  <form onSubmit={handleBulkAddPaste} className="space-y-3">
                    <select
                      value={bulkClassId}
                      onChange={(e) => setBulkClassId(e.target.value)}
                      className="w-full px-3 py-1.5 border rounded-xl outline-none focus:ring-2 focus:ring-[#006837] bg-white text-sm font-semibold"
                      required
                    >
                      <option value="">اختر الصف الموحد للطلاب...</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-500 font-bold">
                        انسخ الأعمدة من Excel: (الاسم [Tab] رقم الهوية [Tab] رقم الجوال)
                      </label>
                      <textarea
                        rows={5}
                        value={bulkTextData}
                        onChange={(e) => setBulkTextData(e.target.value)}
                        placeholder={`محمد علي القحطاني\t1098765432\t0501234567\nسعد عبدالله الشمراني\t1012345678\t0559876543`}
                        className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-[#006837] text-xs font-mono leading-relaxed"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#006837] hover:bg-[#00522b] text-white font-bold py-2 rounded-xl transition-colors text-sm cursor-pointer"
                    >
                      معالجة ولصق الطلاب
                    </button>
                  </form>
                )}

                {/* 3. نموذج الاستيراد من ملف Excel/CSV */}
                {studentAddMode === 'file' && (
                  <form onSubmit={handleBulkAddFile} className="space-y-3">
                    <select
                      value={bulkClassId}
                      onChange={(e) => setBulkClassId(e.target.value)}
                      className="w-full px-3 py-1.5 border rounded-xl outline-none focus:ring-2 focus:ring-[#006837] bg-white text-sm font-semibold"
                      required
                    >
                      <option value="">اختر الصف الموحد للطلاب...</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-500 font-bold block">
                        ارفق ملف CSV (يحتوي على: الاسم، رقم الهوية، رقم الجوال):
                      </label>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                        className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 font-bold cursor-pointer"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 rounded-xl transition-colors text-sm cursor-pointer"
                    >
                      استيراد الطلاب من الملف
                    </button>
                  </form>
                )}
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 font-bold text-slate-800 text-lg mb-4">
                  <FileUp className="w-5 h-5 text-[#006837]" />
                  <h3>رفع نشاط (PDF) جديد</h3>
                </div>
                <form onSubmit={handleAddActivity} className="space-y-3">
                  <input
                    type="text"
                    value={actTitle}
                    onChange={(e) => setActTitle(e.target.value)}
                    placeholder="عنوان النشاط أو الواجب"
                    className="w-full px-3 py-1.5 border rounded-xl outline-none focus:ring-2 focus:ring-[#006837] text-sm font-semibold"
                    required
                  />
                  <select
                    value={actClassId}
                    onChange={(e) => setActClassId(e.target.value)}
                    className="w-full px-3 py-1.5 border rounded-xl outline-none focus:ring-2 focus:ring-[#006837] bg-white text-sm font-semibold"
                    required
                  >
                    <option value="">المرحلة المستهدفة...</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setActFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-[#006837] font-bold"
                    required
                  />

                  <div className="space-y-2 pt-1">
                    <div className="p-2.5 bg-slate-50 border rounded-xl space-y-1">
                      <label className="block text-xs text-[#006837] font-extrabold">🟢 البداية (توقيت أم القرى)</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="p-1.5 border rounded-lg bg-white text-xs"
                          required
                        />
                        <input
                          type="time"
                          value={startTimeOnly}
                          onChange={(e) => setStartTimeOnly(e.target.value)}
                          className="p-1.5 border rounded-lg bg-white text-xs font-mono"
                          required
                        />
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-50 border rounded-xl space-y-1">
                      <label className="block text-xs text-rose-700 font-extrabold">⏰ النهاية (توقيت أم القرى)</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="p-1.5 border rounded-lg bg-white text-xs"
                          required
                        />
                        <input
                          type="time"
                          value={endTimeOnly}
                          onChange={(e) => setEndTimeOnly(e.target.value)}
                          className="p-1.5 border rounded-lg bg-white text-xs font-mono"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#006837] hover:bg-[#00522b] text-white font-bold py-2 rounded-xl transition-colors text-sm cursor-pointer"
                  >
                    نشر النشاط
                  </button>
                </form>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#006837]" /> قائمة الصفوف المسجلة وإدارتها ({classes.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm font-semibold">
                  <thead className="bg-slate-50 text-slate-600 text-xs font-bold border-b">
                    <tr>
                      <th className="p-4">اسم الصف الدراسي</th>
                      <th className="p-4 text-center">التحكم والتعديل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {classes.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="p-6 text-center text-slate-400">لا توجد صفوف مضافة حتى الآن</td>
                      </tr>
                    ) : (
                      classes.map((cls) => (
                        <tr key={cls.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-bold text-slate-800">{cls.name}</td>
                          <td className="p-4 text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => handleDeleteClass(cls.id)}
                                className="p-1.5 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};