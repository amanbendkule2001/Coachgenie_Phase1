"use client";

import { useEffect, useState, useCallback } from "react";
import { Zap } from "lucide-react";
import { toast } from "sonner";

/**
 * DevAutoFill - Development-only assistant to populate forms with realistic test data instantly.
 * Active strictly when process.env.NODE_ENV === "development" or NEXT_PUBLIC_ENABLE_DEV_AUTOFILL === "true".
 */
export function DevAutoFill() {
  const [mounted, setMounted] = useState(false);
  const [isDev, setIsDev] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isDevEnv = process.env.NODE_ENV === "development" || 
                     process.env.NEXT_PUBLIC_ENABLE_DEV_AUTOFILL === "true";
    setIsDev(isDevEnv);
  }, []);

  const fillActiveForm = useCallback(() => {
    // Find active modal or form, or fallback to main document
    const modal = document.querySelector('[role="dialog"], .fixed.z-50, form');
    const container = modal || document;

    const inputs = Array.from(container.querySelectorAll<HTMLInputElement>("input:not([type='hidden']):not([disabled])"));
    const textareas = Array.from(container.querySelectorAll<HTMLTextAreaElement>("textarea:not([disabled])"));
    const selects = Array.from(container.querySelectorAll<HTMLSelectElement>("select:not([disabled])"));

    if (inputs.length === 0 && textareas.length === 0 && selects.length === 0) {
      toast.info("No editable form fields found on screen");
      return;
    }

    let filledCount = 0;

    // Helper to trigger React state updates via Native Property Setter
    const setElementValue = (el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) => {
      let prototype: any = window.HTMLInputElement.prototype;
      if (el instanceof HTMLTextAreaElement) prototype = window.HTMLTextAreaElement.prototype;
      if (el instanceof HTMLSelectElement) prototype = window.HTMLSelectElement.prototype;

      const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
      if (descriptor && descriptor.set) {
        descriptor.set.call(el, value);
      } else {
        (el as any).value = value;
      }

      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.dispatchEvent(new Event("blur", { bubbles: true }));
      filledCount++;
    };

    // 1. Process Input elements
    inputs.forEach((input) => {
      const type = input.type.toLowerCase();
      const name = (input.name || input.id || input.placeholder || "").toLowerCase();
      
      // Get associated label text if available
      let labelText = "";
      if (input.id) {
        const labelEl = container.querySelector(`label[for="${input.id}"]`);
        if (labelEl) labelText = labelEl.textContent?.toLowerCase() || "";
      }
      if (!labelText && input.parentElement) {
        labelText = input.parentElement.textContent?.toLowerCase() || "";
      }

      const combinedKey = `${name} ${labelText}`;

      if (type === "checkbox" || type === "radio") {
        if (!input.checked) {
          input.click();
          filledCount++;
        }
        return;
      }

      if (type === "date") {
        const today = new Date().toISOString().split("T")[0];
        setElementValue(input, today);
        return;
      }

      if (type === "number") {
        if (combinedKey.includes("discount")) {
          setElementValue(input, "500");
        } else if (combinedKey.includes("amount") || combinedKey.includes("fee") || combinedKey.includes("price") || combinedKey.includes("cost")) {
          setElementValue(input, "15000");
        } else if (combinedKey.includes("age")) {
          setElementValue(input, "17");
        } else if (combinedKey.includes("capacity")) {
          setElementValue(input, "50");
        } else {
          setElementValue(input, "100");
        }
        return;
      }

      if (type === "email" || combinedKey.includes("email")) {
        const randStr = Math.random().toString(36).substring(2, 7);
        setElementValue(input, `test.user.${randStr}@example.com`);
        return;
      }

      if (combinedKey.includes("phone") || combinedKey.includes("mobile") || combinedKey.includes("whatsapp") || combinedKey.includes("contact")) {
        const randDigits = Math.floor(100000000 + Math.random() * 900000000);
        setElementValue(input, `9${randDigits}`);
        return;
      }

      if (combinedKey.includes("reference") || combinedKey.includes("utr") || combinedKey.includes("transaction")) {
        const randUtr = Math.floor(100000000000 + Math.random() * 900000000000);
        setElementValue(input, `UPI-${randUtr}`);
        return;
      }

      if (combinedKey.includes("invoice") || combinedKey.includes("receipt") || combinedKey.includes("number") || combinedKey.includes("code")) {
        const randInv = Math.floor(1000 + Math.random() * 9000);
        setElementValue(input, `INV-2026-${randInv}`);
        return;
      }

      if (combinedKey.includes("name") || combinedKey.includes("student") || combinedKey.includes("father") || combinedKey.includes("parent")) {
        const names = ["Arjun Sharma", "Priya Verma", "Rahul Mehta", "Ananya Iyer", "Rohan Patel"];
        const selectedName = names[Math.floor(Math.random() * names.length)];
        setElementValue(input, selectedName);
        return;
      }

      if (combinedKey.includes("city") || combinedKey.includes("address") || combinedKey.includes("location")) {
        setElementValue(input, "MG Road, Sector 14, New Delhi");
        return;
      }

      // Default text input fallback
      setElementValue(input, "Test Sample Value");
    });

    // 2. Process Textarea elements
    textareas.forEach((textarea) => {
      setElementValue(textarea, "Automated test description created for feature verification.");
    });

    // 3. Process Select elements
    selects.forEach((select) => {
      if (select.options.length > 0) {
        // Select first non-empty option
        let targetIdx = 0;
        for (let i = 0; i < select.options.length; i++) {
          if (select.options[i].value !== "" && select.options[i].value !== "placeholder") {
            targetIdx = i;
            break;
          }
        }
        setElementValue(select, select.options[targetIdx].value);
      }
    });

    toast.success(`⚡ Dev Auto-Fill: Populated ${filledCount} fields`, {
      description: "Press Alt + A anytime to auto-fill active forms.",
      duration: 3000,
    });
  }, []);

  // Keyboard shortcut listener (Alt + A or Alt + Shift + F)
  useEffect(() => {
    if (!isDev) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && e.key.toLowerCase() === "a") || (e.altKey && e.shiftKey && e.key.toLowerCase() === "f")) {
        e.preventDefault();
        fillActiveForm();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDev, fillActiveForm]);

  if (!mounted || !isDev) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
      <button
        onClick={fillActiveForm}
        type="button"
        title="Auto-Fill active form (Shortcut: Alt + A)"
        className="flex items-center gap-2 rounded-full bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-2 text-xs font-semibold shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 group border border-amber-400/30"
      >
        <Zap className="h-3.5 w-3.5 fill-current animate-pulse group-hover:scale-110 transition-transform" />
        <span>Auto-Fill Test Data</span>
        <span className="bg-amber-700/40 text-amber-100 text-[10px] px-1.5 py-0.5 rounded font-mono border border-amber-400/20">
          Alt+A
        </span>
      </button>
    </div>
  );
}

export default DevAutoFill;
