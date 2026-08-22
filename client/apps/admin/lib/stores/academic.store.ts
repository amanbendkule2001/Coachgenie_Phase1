"use client";
import { persist } from "zustand/middleware";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  Student, Batch, AttendanceRecord, Exam, ExamResult,
  FeeRecord, AttendanceStatus,
} from "@/lib/types/academic";

const SEED_BATCHES: Batch[] = [];



const SEED_FEE_RECORDS: FeeRecord[] = [];

function generateAttendance(): AttendanceRecord[] {
  return [];
}

interface AcademicStore {
  students:   Student[];
  batches:    Batch[];
  attendance: AttendanceRecord[];
  exams:      Exam[];
  feeRecords: FeeRecord[];  setStudents:      (students: Student[]) => void;
  addStudent:       (student: Student) => void;
  updateStudent:    (id: string, patch: Partial<Student>) => void;
  deleteStudent:    (id: string) => void;

  setBatches:       (batches: Batch[]) => void;
  addBatch:         (batch: Batch) => void;
  updateBatch:      (id: string, patch: Partial<Batch>) => void;
  deleteBatch:      (id: string) => void;
  toggleSyllabus:   (batchId: string, topicId: string) => void;
  addSyllabusTopic: (batchId: string, topic: { title: string; sessions: number }) => void;
  markTopicComplete:(batchId: string, topicId: string) => void;
  enrollStudent:    (batchId: string, studentId: string) => void;

  markAttendance:   (records: Omit<AttendanceRecord, "id">[]) => void;

  setExams:         (exams: Exam[]) => void;
  addExam:          (exam: Omit<Exam, "id" | "results">) => Exam;
  saveResults:      (examId: string, results: ExamResult[]) => void;

  addFeeRecord:     (record: Omit<FeeRecord, "id">) => void;
}

export const useAcademicStore = create<AcademicStore>()(
  persist(
    immer((set) => ({
      students:   [],
      // batches:    SEED_BATCHES,
      batches: [],
      attendance: [],
      exams: [],
      feeRecords: [],

      // Students
      setStudents:   (students) => set((s) => { s.students = students; }),
      addStudent:    (student)  => set((s) => { s.students.unshift(student); }),
      updateStudent: (id, patch) => set((s) => {
        const i = s.students.findIndex((x) => x.id === id);
        if (i !== -1) Object.assign(s.students[i]!, patch);
      }),
      deleteStudent: (id) => set((s) => { s.students = s.students.filter((x) => x.id !== id); }),

      // Batches
      setBatches: (batches) => set((s) => { s.batches = batches; }),
      addBatch:   (batch)   => set((s) => { s.batches.unshift(batch); }),
      updateBatch: (id, patch) => set((s) => {
        const i = s.batches.findIndex((b) => b.id === id);
        if (i !== -1) Object.assign(s.batches[i]!, patch);
      }),
      deleteBatch: (id) => set((s) => { s.batches = s.batches.filter((x) => x.id !== id); }),

      toggleSyllabus: (batchId, topicId) => set((s) => {
        const batch = s.batches.find((b) => b.id === batchId);
        const topic = batch?.syllabus?.find((t) => t.id === topicId);
        if (topic) topic.completed = !topic.completed;
      }),

      addSyllabusTopic: (batchId, topic) => set((s) => {
        const batch = s.batches.find((b) => b.id === batchId);
        if (batch) {
          if (!batch.syllabus) batch.syllabus = [];
          batch.syllabus.push({
            id: `sy-${Date.now()}`,
            title: topic.title,
            sessions: topic.sessions,
            completed: false,
          });
        }
      }),

      markTopicComplete: (batchId, topicId) => set((s) => {
        const batch = s.batches.find((b) => b.id === batchId);
        const topic = batch?.syllabus?.find((t) => t.id === topicId);
        if (topic) topic.completed = true;
      }),

      enrollStudent: (batchId, studentId) => set((s) => {
        const batch   = s.batches.find((b) => b.id === batchId);
        const student = s.students.find((x) => x.id === studentId);
        if (batch   && !batch.studentIds.includes(studentId))  batch.studentIds.push(studentId);
        if (student && !student.batchIds.includes(batchId))    student.batchIds.push(batchId);
      }),

      // Attendance
      markAttendance: (records) => set((s) => {
        records.forEach((rec) => {
          const i = s.attendance.findIndex(
            (a) => a.studentId === rec.studentId && a.batchId === rec.batchId && a.date === rec.date
          );
          if (i !== -1) Object.assign(s.attendance[i]!, rec);
          else s.attendance.push({ ...rec, id: `att-${Date.now()}-${Math.random()}` });
        });
      }),

      // Exams
      setExams: (exams) => set((s) => { s.exams = exams; }),
      addExam: (data) => {
        const exam: Exam = { ...data, id: `e-${Date.now()}`, results: [] };
        set((s) => { s.exams.unshift(exam); });
        return exam;
      },

      saveResults: (examId, results) => set((s) => {
        const exam = s.exams.find((e) => e.id === examId);
        if (!exam) return;
        const sorted = [...results].filter((r) => r.marks !== null)
          .sort((a, b) => (b.marks ?? 0) - (a.marks ?? 0));
        exam.results = results.map((r) => {
          const rank       = sorted.findIndex((x) => x.studentId === r.studentId) + 1;
          const percentile = r.marks !== null
            ? Math.round(((sorted.length - rank) / sorted.length) * 100) : undefined;
          const pct   = r.marks !== null ? (r.marks / exam.maxMarks) * 100 : 0;
          const grade = pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B+" : pct >= 60 ? "B" : pct >= 50 ? "C" : "D";
          return { ...r, rank: r.marks !== null ? rank : undefined, percentile, grade };
        });
        exam.status = "COMPLETED";
      }),

      // Fees
      addFeeRecord: (record) => set((s) => {
        s.feeRecords.unshift({ ...record, id: `f-${Date.now()}` });
      }),
    })),
    {
      name: "academic-store",
      partialize: (state: AcademicStore) => ({
        batches:    state.batches,
        exams:      state.exams,
        feeRecords: state.feeRecords,
        attendance: state.attendance,
      }),
    }
  )
);
