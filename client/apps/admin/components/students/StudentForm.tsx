"use client";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import type { Student } from "@/lib/types/academic";

const schema = z.object({
  name:        z.string().min(2, "Name must be at least 2 characters"),
  email:       z.string().email("Invalid email address").optional().or(z.literal("")),
  phone:       z.string().optional().or(z.literal("")),
  parentName:  z.string().optional().or(z.literal("")),
  parentPhone: z.string().optional().or(z.literal("")),
  grade:       z.string().optional().or(z.literal("")),
  subjects:    z.string().optional().or(z.literal("")),
  address:     z.string().optional().or(z.literal("")),
  dob:         z.string().optional().or(z.literal("")),
  status:      z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "GRADUATED"]),
  targetExam:  z.string().optional().or(z.literal("")),
  schoolName:  z.string().optional().or(z.literal("")),
  gender:      z.string().optional().or(z.literal("")),
});
export type StudentFormValues = z.infer<typeof schema>;

const inputCls = "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function normalizeGrade(grade?: string): string {
  if (!grade) return "";
  const clean = grade.trim();
  if (/^\d+$/.test(clean)) {
    return `${clean}th`;
  }
  return clean;
}

function normalizeDob(dob?: string): string {
  if (!dob) return "";
  return String(dob).split("T")[0];
}

interface StudentFormProps {
  defaultValues?: Partial<Student>;
  onSubmit:  (d: StudentFormValues) => Promise<void>;
  onCancel:  () => void;
  submitLabel?: string;
}

const Field = ({ label, error, className, children }: { label: string; error?: string; className?: string; children: React.ReactNode }) => (
  <div className={`space-y-1.5 ${className ?? ""}`}>
    <label className="text-sm font-medium">{label}</label>
    {children}
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
);

export function StudentForm({ defaultValues, onSubmit, onCancel, submitLabel = "Create Student" }: StudentFormProps) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<StudentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:        defaultValues?.name        ?? "",
      email:       defaultValues?.email       ?? "",
      phone:       defaultValues?.phone       ?? "",
      parentName:  defaultValues?.parentName  ?? "",
      parentPhone: defaultValues?.parentPhone ?? "",
      grade:       normalizeGrade(defaultValues?.grade),
      subjects:    Array.isArray(defaultValues?.subjects) ? defaultValues.subjects.join(", ") : (defaultValues?.subjects ?? ""),
      address:     defaultValues?.address     ?? "",
      dob:         normalizeDob(defaultValues?.dob),
      status:      defaultValues?.status      ?? "ACTIVE",
      targetExam:  defaultValues?.targetExam  ?? "",
      schoolName:  defaultValues?.schoolName  ?? "",
      gender:      defaultValues?.gender      ?? "",
    },
  });

  useEffect(() => {
    if (defaultValues) {
      reset({
        name:        defaultValues.name        ?? "",
        email:       defaultValues.email       ?? "",
        phone:       defaultValues.phone       ?? "",
        parentName:  defaultValues.parentName  ?? "",
        parentPhone: defaultValues.parentPhone ?? "",
        grade:       normalizeGrade(defaultValues.grade),
        subjects:    Array.isArray(defaultValues.subjects) ? defaultValues.subjects.join(", ") : (defaultValues.subjects ?? ""),
        address:     defaultValues.address     ?? "",
        dob:         normalizeDob(defaultValues.dob),
        status:      defaultValues.status      ?? "ACTIVE",
        targetExam:  defaultValues.targetExam  ?? "",
        schoolName:  defaultValues.schoolName  ?? "",
        gender:      defaultValues.gender      ?? "",
      });
    }
  }, [defaultValues, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Student Name" error={errors.name?.message}>
          <input {...register("name")} placeholder="Aarav Sharma" className={inputCls} />
        </Field>
        <Field label="Date of Birth" error={errors.dob?.message}>
          <input {...register("dob")} type="date" className={inputCls} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <input {...register("email")} type="email" placeholder="aarav@gmail.com" className={inputCls} />
        </Field>
        <Field label="Phone" error={errors.phone?.message}>
          <input {...register("phone")} placeholder="9876543210" className={inputCls} />
        </Field>
        <Field label="Parent Name" error={errors.parentName?.message}>
          <input {...register("parentName")} placeholder="Suresh Sharma" className={inputCls} />
        </Field>
        <Field label="Parent Phone" error={errors.parentPhone?.message}>
          <input {...register("parentPhone")} placeholder="9876543200" className={inputCls} />
        </Field>
        <Field label="Grade" error={errors.grade?.message}>
          <select {...register("grade")} className={inputCls}>
            <option value="">Select Grade</option>
            {["8th", "9th", "10th", "11th", "12th", "Dropper"].map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </Field>
        <Field label="Status" error={errors.status?.message}>
          <select {...register("status")} className={inputCls}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="GRADUATED">Graduated</option>
          </select>
        </Field>
        <Field label="Subjects (comma separated)" error={errors.subjects?.message}>
          <input {...register("subjects")} placeholder="Mathematics, Physics" className={inputCls} />
        </Field>
        <Field label="Target Exam" error={errors.targetExam?.message}>
          <input {...register("targetExam")} placeholder="JEE, NEET, Boards" className={inputCls} />
        </Field>
        <Field label="School Name" error={errors.schoolName?.message}>
          <input {...register("schoolName")} placeholder="Delhi Public School" className={inputCls} />
        </Field>
        <Field label="Gender" error={errors.gender?.message}>
          <select {...register("gender")} className={inputCls}>
            <option value="">Select</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </Field>
        <Field label="Address" error={errors.address?.message} className="col-span-1 sm:col-span-2">
          <input {...register("address")} placeholder="Shivajinagar, Pune" className={inputCls} />
        </Field>
      </div>
      <div className="flex justify-end gap-3 pt-2 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
