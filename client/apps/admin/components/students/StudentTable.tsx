// ====================================================================New================================================================
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  ArrowUpDown,
  Eye,
  FileText,
  Loader2,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";

import { format } from "date-fns";

import { cn } from "@/lib/utils";
import type { Student } from "@/lib/types/academic";

const STATUS_STYLE: Record<Student["status"], string> = {
  ACTIVE:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400",

  INACTIVE:
    "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800",

  SUSPENDED:
    "bg-red-50 text-red-600 border-red-200 dark:bg-red-950",

  GRADUATED:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950",
};

interface StudentTableProps {
  students: Student[];
  onDelete: (id: string) => void;
  onEdit?: (student: Student) => void;
  onGenerateReport?: (studentId: string) => void;
  generatingReportId?: string | null;
}

export function StudentTable({
  students,
  onDelete,
  onEdit,
  onGenerateReport,
  generatingReportId,
}: StudentTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"ACTIVE" | "INACTIVE" | "ALL">("ALL");

  const filtered = useMemo(() => {
    let data = students;

    if (statusFilter !== "ALL") {
      data = data.filter((s) => s.status === statusFilter);
    }

    if (!globalFilter.trim()) {
      return data;
    }

    const search = globalFilter.toLowerCase();

    return data.filter((student) => {
      return (
        student.name.toLowerCase().includes(search) ||
        student.email.toLowerCase().includes(search) ||
        student.phone.toLowerCase().includes(search) ||
        student.grade.toLowerCase().includes(search)
      );
    });
  }, [students, statusFilter, globalFilter]);

  const columns = useMemo<ColumnDef<Student>[]>(() => [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <button className="flex items-center gap-1 hover:text-foreground"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Student <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0">
            {row.original.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
          </div>
          <div>
            <p className="font-medium text-sm">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.email}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ getValue }) => <span className="text-sm font-mono">{getValue<string>()}</span>,
    },
    {
      accessorKey: "grade",
      header: "Grade",
      cell: ({ getValue }) => <span className="text-sm">{getValue<string>()}</span>,
    },
    {
      accessorKey: "subjects",
      header: "Subjects",
      cell: ({ getValue }) => {
        const subjects = (getValue<string[]>() ?? []).filter(s => s && s !== "N/A");
        if (!subjects.length) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {subjects.slice(0, 2).map(s => (
              <span key={s} className="rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[10px] font-medium">
                {s}
              </span>
            ))}
            {subjects.length > 2 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                +{subjects.length - 2}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "fees",
      header: "Fee Status",
      cell: ({ row }) => {
        const { paid, total, due } = row.original.fees;
        if (!total && !paid) {
          return <span className="text-xs text-muted-foreground">No Fees</span>;
        }
        const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 100;
        return (
          <div className="space-y-1 min-w-[120px]">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-foreground">₹{paid.toLocaleString("en-IN")}</span>
              <span className="text-muted-foreground">of ₹{total.toLocaleString("en-IN")}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", pct === 100 ? "bg-emerald-500" : "bg-amber-500")}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px]">
              <span className={cn("font-medium", due > 0 ? "text-red-500" : "text-emerald-600")}>
                {due > 0 ? `Due: ₹${due.toLocaleString("en-IN")}` : "Paid in Full"}
              </span>
              <span className="text-muted-foreground font-semibold">{pct}%</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => (
        <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", STATUS_STYLE[getValue<Student["status"]>()])}>
          {getValue<string>()}
        </span>
      ),
    },
    {
      accessorKey: "joinedAt",
      header: "Joined",
      cell: ({ getValue }) => {
        const val = getValue<string>();
        if (!val) return <span className="text-xs text-muted-foreground">—</span>;
        return <span className="text-xs text-muted-foreground">{format(new Date(val), "dd MMM yy")}</span>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const isGenerating = generatingReportId === row.original.id;
        return (
          <div className="flex gap-1">
            {/* View */}
            <Link href={`/students/${row.original.id}`}
              aria-label={`View profile for ${row.original.name}`}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title="View profile">
              <Eye className="h-3.5 w-3.5" />
            </Link>

            {/* Edit */}
            {onEdit && (
              <button
                onClick={() => onEdit(row.original)}
                aria-label={`Edit student ${row.original.name}`}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                title="Edit student"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Generate Report */}
            {onGenerateReport && (
              <button
                onClick={() => onGenerateReport(row.original.id)}
                disabled={isGenerating}
                aria-label={`Generate report for ${row.original.name}`}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
                title="Generate report"
              >
                {isGenerating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileText className="h-3.5 w-3.5" />
                )}
              </button>
            )}

            {/* Delete / Deactivate */}
            <button
              onClick={() => onDelete(row.original.id)}
              aria-label={`Deactivate student ${row.original.name}`}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              title="Deactivate student"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      },
    },
  ], [onDelete, onEdit, onGenerateReport, generatingReportId]);

  const tableData = useMemo(() => [...filtered], [filtered]);
  const table = useReactTable({
    // data: filtered,
    data: tableData,
    columns,

    state: {
      sorting,
    },

    onSortingChange: setSorting,

    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),

    autoResetAll: false,
  });
  console.log({
    selected: statusFilter,
    filtered: filtered.length,
    rows: table.getRowModel().rows.length,
  });


  // const headerGroups = useMemo(
  //   () => table.getHeaderGroups(),
  //   [table]
  // );

  // const rows = useMemo(
  //   () => table.getRowModel().rows,
  //   [table]
  // );
  const headerGroups = table.getHeaderGroups();
  const rows = table.getRowModel().rows;


  return (
    <div className="space-y-3">
      

      {/* Table */}
      <div className="rounded-xl border overflow-x-auto min-w-full">
        <table className="w-full text-sm">
          <thead>
            {headerGroups.map((hg) => (
              <tr key={hg.id} className="border-b bg-muted/40">
                {hg.headers.map(h => (
                  <th key={h.id} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="h-32 text-center text-sm text-muted-foreground"
                >
                  No students found.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const cells = row.getVisibleCells();

                return (
                  <tr
                    key={row.id}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    {cells.map((cell) => (
                      <td
                        key={cell.id}
                        className="px-4 py-3 align-middle whitespace-nowrap"
                      >
                        <div>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <p className="text-xs text-muted-foreground">
          {filtered.length} students
        </p>
      </div>
    </div>
  );
}