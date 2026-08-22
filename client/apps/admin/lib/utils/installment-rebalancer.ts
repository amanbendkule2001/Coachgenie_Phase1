import { format, addMonths } from "date-fns";

export interface InstallmentItem {
  number: number;
  amount: number;
  dueDate: string;
  paid: boolean;
  isCustom?: boolean;
}

/**
 * Creates an initial schedule of `count` installments for a given remaining balance.
 */
export function createInitialInstallmentSchedule(
  remainingBalance: number,
  count: number,
  startDates: string[] = []
): InstallmentItem[] {
  if (count <= 0 || remainingBalance <= 0) return [];
  const base = Math.floor(remainingBalance / count);
  const extra = remainingBalance - base * count;

  return Array.from({ length: count }, (_, i) => {
    let dateStr = startDates[i] ?? "";
    if (!dateStr) {
      const d = addMonths(new Date(), i + 1);
      dateStr = format(d, "yyyy-MM-dd");
    }
    return {
      number: i + 1,
      amount: i === 0 ? base + extra : base,
      dueDate: dateStr,
      paid: false,
      isCustom: false,
    };
  });
}

/**
 * Rebalances installment schedule when an installment amount is changed or marked paid.
 * Ensures the sum of all unpaid installments equals `remainingBalance`.
 * Appends an unpaid installment if all current slots are paid but balance remains.
 */
export function rebalanceInstallmentSchedule(
  schedule: InstallmentItem[],
  remainingBalance: number,
  changedIndex?: number,
  newAmount?: number
): InstallmentItem[] {
  if (!schedule || schedule.length === 0) {
    if (remainingBalance > 0) {
      return [{ number: 1, amount: remainingBalance, dueDate: format(addMonths(new Date(), 1), "yyyy-MM-dd"), paid: false }];
    }
    return [];
  }

  const updated = schedule.map((item) => ({ ...item }));

  // If a specific index changed amount
  if (changedIndex !== undefined && newAmount !== undefined && changedIndex >= 0 && changedIndex < updated.length) {
    const clampedAmount = Math.max(0, Math.min(newAmount, remainingBalance));
    updated[changedIndex].amount = clampedAmount;
    updated[changedIndex].isCustom = true;
  }

  // Calculate sum of custom-changed UNPAID installments
  let fixedCustomSum = 0;
  const unfixedIndices: number[] = [];

  updated.forEach((item, idx) => {
    if (item.paid) {
      // Paid items keep their paid amount
    } else if (item.isCustom && idx === changedIndex) {
      fixedCustomSum += item.amount;
    } else {
      unfixedIndices.push(idx);
    }
  });

  const unallocated = Math.max(0, remainingBalance - fixedCustomSum);

  if (unfixedIndices.length > 0) {
    const perItem = Math.floor(unallocated / unfixedIndices.length);
    const extra = unallocated - perItem * unfixedIndices.length;

    unfixedIndices.forEach((idx, i) => {
      updated[idx].amount = i === 0 ? perItem + extra : perItem;
    });
  } else if (remainingBalance > 0) {
    // All existing slots are paid, but there is still an uncollected balance!
    // Append an unpaid slot for the remaining balance!
    const lastDate = updated[updated.length - 1]?.dueDate ?? "";
    let newDateStr = "";
    if (lastDate) {
      try {
        const parts = lastDate.split("-");
        if (parts.length === 3) {
          const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          d.setMonth(d.getMonth() + 1);
          newDateStr = format(d, "yyyy-MM-dd");
        }
      } catch {}
    }
    if (!newDateStr) {
      newDateStr = format(addMonths(new Date(), updated.length + 1), "yyyy-MM-dd");
    }

    updated.push({
      number: updated.length + 1,
      amount: remainingBalance,
      dueDate: newDateStr,
      paid: false,
      isCustom: false,
    });
  }

  return updated;
}

/**
 * Adds a new installment to the schedule and auto-rebalances.
 */
export function addInstallmentToSchedule(
  schedule: InstallmentItem[],
  remainingBalance: number
): InstallmentItem[] {
  const nextNum = (schedule?.length ?? 0) + 1;
  const lastDueDate = schedule && schedule.length > 0 ? schedule[schedule.length - 1].dueDate : "";
  let newDateStr = "";

  if (lastDueDate) {
    try {
      const parts = lastDueDate.split("-");
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        d.setMonth(d.getMonth() + 1);
        newDateStr = format(d, "yyyy-MM-dd");
      }
    } catch {}
  }
  if (!newDateStr) {
    newDateStr = format(addMonths(new Date(), nextNum), "yyyy-MM-dd");
  }

  const newItem: InstallmentItem = {
    number: nextNum,
    amount: 0,
    dueDate: newDateStr,
    paid: false,
    isCustom: false,
  };

  const nextSchedule = [...(schedule || []), newItem];
  return rebalanceInstallmentSchedule(nextSchedule, remainingBalance);
}

/**
 * Removes an installment at `indexToRemove` from the schedule and auto-rebalances.
 */
export function removeInstallmentFromSchedule(
  schedule: InstallmentItem[],
  indexToRemove: number,
  remainingBalance: number
): InstallmentItem[] {
  if (!schedule || schedule.length <= 1) return schedule;

  const filtered = schedule.filter((_, idx) => idx !== indexToRemove);
  const reindexed = filtered.map((item, idx) => ({
    ...item,
    number: idx + 1,
  }));

  return rebalanceInstallmentSchedule(reindexed, remainingBalance);
}
