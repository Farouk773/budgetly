"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

export type SelectOption = {
  value: string;
  label: string;
};

/**
 * Custom listbox replacing native <select> elements, per SELECT_DESIGN_PLAN.md.
 * Controlled component with an API close to a native <select>: `value` /
 * `onChange(value)` / `options`. Fully keyboard- and screen-reader-accessible
 * (ARIA listbox pattern) since it renders its own popup instead of relying on
 * the browser's native (unstyleable) dropdown sheet.
 */
export function Select({
  id,
  value,
  onChange,
  options,
  disabled = false,
  placeholder = "Sélectionner...",
  className = "",
  solidDarkBackground = false,
  "aria-labelledby": ariaLabelledBy,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** Use a solid dark surface background instead of transparent (matches the
   * few triggers that previously used `dark:bg-[#131a2e]`). */
  solidDarkBackground?: boolean;
  "aria-labelledby"?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [popupRect, setPopupRect] = useState<{
    left: number;
    width: number;
    top?: number;
    bottom?: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeaheadRef = useRef<{ text: string; timeout: ReturnType<typeof setTimeout> | null }>({
    text: "",
    timeout: null,
  });

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null;

  function openPopup() {
    if (disabled || options.length === 0) return;
    const trigger = triggerRef.current;
    if (trigger) {
      const rect = trigger.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldOpenUpward = spaceBelow < 260 && spaceAbove > spaceBelow;
      setOpenUpward(shouldOpenUpward);
      // Rendered in a portal (see below) so the popup is never clipped by an
      // ancestor with `overflow: hidden` (e.g. `.card-elevated`). Position is
      // computed from the trigger's viewport rect and kept in sync with
      // `position: fixed`, which uses the same coordinate space. The upward
      // case anchors via `bottom` (not `top` + a transform) so it doesn't
      // fight with the scale-in animation, which also animates `transform`.
      setPopupRect(
        shouldOpenUpward
          ? { bottom: window.innerHeight - rect.top + 6, left: rect.left, width: rect.width }
          : { top: rect.bottom + 6, left: rect.left, width: rect.width }
      );
    }
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setIsOpen(true);
  }

  function closePopup(refocusTrigger: boolean) {
    setIsOpen(false);
    if (refocusTrigger) triggerRef.current?.focus();
  }

  function commitSelection(index: number) {
    const option = options[index];
    if (!option) return;
    if (option.value !== value) onChange(option.value);
    closePopup(true);
  }

  // Focus the listbox itself as soon as it opens, so arrow keys/typeahead
  // work immediately without an extra Tab press. `preventScroll` avoids the
  // browser auto-scrolling the page to reveal the focused element, which
  // would otherwise immediately trigger the scroll-close effect below.
  useEffect(() => {
    if (isOpen) listRef.current?.focus({ preventScroll: true });
  }, [isOpen]);

  // Close on outside click / tap, without changing the value (same as Escape).
  // The popup itself lives in a portal (outside containerRef's subtree), so
  // it must be checked separately.
  useEffect(() => {
    if (!isOpen) return;
    function isOutside(target: Node) {
      return (
        !containerRef.current?.contains(target) && !listRef.current?.contains(target)
      );
    }
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (isOutside(e.target as Node)) closePopup(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [isOpen]);

  // The popup is positioned from a snapshot of the trigger's rect (taken at
  // open time) rather than tracked continuously, so close it if the page is
  // scrolled or resized underneath it to avoid a stale/misaligned popup.
  // Scrolling inside the popup's own option list must not close it.
  useEffect(() => {
    if (!isOpen) return;
    const openWidth = window.innerWidth;
    function onScroll(e: Event) {
      if (listRef.current?.contains(e.target as Node)) return;
      closePopup(false);
    }
    function onResize() {
      // Ignore height-only changes: on mobile, the address bar hiding or the
      // on-screen keyboard opening fires a `resize` event without any real
      // layout change for this popup's horizontal position, and closing here
      // would otherwise make the popup unusable on phones (see
      // SELECT_DESIGN_PLAN.md mobile requirements).
      if (window.innerWidth !== openWidth) closePopup(false);
    }
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [isOpen]);

  // Keep the active option in view while navigating with the keyboard.
  useEffect(() => {
    if (!isOpen) return;
    const activeEl = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [isOpen, activeIndex]);

  function handleTriggerKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
      e.preventDefault();
      if (!isOpen) openPopup();
      return;
    }
    handleTypeahead(e);
  }

  function handleListKeyDown(e: React.KeyboardEvent<HTMLUListElement>) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, options.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
        e.preventDefault();
        commitSelection(activeIndex);
        break;
      case "Escape":
        e.preventDefault();
        closePopup(true);
        break;
      case "Tab":
        // Never trap focus: let Tab continue to the next form field, just
        // close the popup first without changing the value.
        closePopup(false);
        break;
      default:
        handleTypeahead(e);
    }
  }

  function handleTypeahead(e: React.KeyboardEvent) {
    if (e.key.length !== 1 || e.altKey || e.ctrlKey || e.metaKey) return;
    const state = typeaheadRef.current;
    if (state.timeout) clearTimeout(state.timeout);
    state.text += e.key.toLowerCase();
    state.timeout = setTimeout(() => {
      state.text = "";
    }, 500);

    const match = options.findIndex((option) =>
      option.label.toLowerCase().startsWith(state.text)
    );
    if (match >= 0) {
      if (isOpen) {
        setActiveIndex(match);
      } else {
        onChange(options[match].value);
      }
    }
  }

  const triggerStateClasses = isOpen
    ? "border-indigo-500 ring-2 ring-indigo-100 dark:ring-indigo-500/20"
    : "border-slate-300 hover:border-slate-400 dark:border-white/15 dark:hover:border-white/25";

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={ariaLabelledBy}
        onClick={() => (isOpen ? closePopup(true) : openPopup())}
        onKeyDown={handleTriggerKeyDown}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-transparent px-3 py-2 text-left text-sm transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
          solidDarkBackground ? "dark:bg-[#131a2e]" : ""
        } ${triggerStateClasses}`}
      >
        <span
          className={
            selectedOption
              ? "truncate text-slate-900 dark:text-slate-100"
              : "truncate text-slate-400 dark:text-slate-500"
          }
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ease-out dark:text-slate-500 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen &&
        popupRect &&
        createPortal(
          <ul
            ref={listRef}
            role="listbox"
            tabIndex={-1}
            aria-activedescendant={
              id && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined
            }
            onKeyDown={handleListKeyDown}
            className={`animate-scale-in fixed z-50 max-h-64 overflow-y-auto rounded-xl border p-1.5 outline-none ${
              openUpward ? "origin-bottom" : "origin-top"
            }`}
            style={{
              top: popupRect.top,
              bottom: popupRect.bottom,
              left: popupRect.left,
              minWidth: popupRect.width,
              backgroundColor: "var(--surface)",
              borderColor: "var(--surface-border-strong)",
              boxShadow:
                "0 12px 28px -8px var(--brand-shadow), 0 4px 10px rgba(15, 23, 42, 0.08)",
            }}
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = index === activeIndex;
              return (
                <li
                  key={option.value}
                  id={id ? `${id}-option-${index}` : undefined}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => commitSelection(index)}
                  className={`relative flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-lg py-2.5 pl-3.5 pr-3 text-sm transition-colors duration-150 ease-out ${
                    isSelected
                      ? "bg-gradient-to-r from-violet-500/15 via-indigo-500/15 to-blue-500/15 font-medium text-indigo-700 dark:text-indigo-300"
                      : isActive
                        ? "bg-indigo-50 text-slate-700 dark:bg-indigo-500/10 dark:text-slate-200"
                        : "text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {isActive && !isSelected && (
                    <span className="bg-brand-gradient absolute inset-y-1.5 left-0 w-0.5 rounded-full" />
                  )}
                  <span className="truncate">{option.label}</span>
                  {isSelected && (
                    <Check className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                  )}
                </li>
              );
            })}
          </ul>,
          document.body
        )}
    </div>
  );
}
