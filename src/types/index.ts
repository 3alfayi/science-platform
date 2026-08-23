export interface ClassItem {
  id: string;
  name: string;
  created_at?: string;
}

export interface Student {
  id: string;
  national_id: string;
  full_name: string;
  class_id: string;
  parent_phone?: string;
  created_at?: string;
  classes?: ClassItem;
}

export interface Activity {
  id: string;
  title: string;
  description?: string;
  class_id: string;
  pdf_url: string;
  start_time: string;
  end_time: string;
  created_at?: string;
  classes?: ClassItem;
}

export interface Submission {
  id: string;
  activity_id: string;
  student_id: string;
  answers_data: Record<string, any>;
  score?: number | null;
  submitted_at?: string;
  students?: Student;
  activities?: Activity;
}

export type UserRole = 'teacher' | 'student' | null;

export interface AuthUser {
  role: UserRole;
  studentData?: Student;
  teacherEmail?: string;
}