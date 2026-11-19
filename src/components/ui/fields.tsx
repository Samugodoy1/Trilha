"use client";

import { forwardRef, useEffect, useId, useImperativeHandle, useRef } from "react";
import { motion } from "motion/react";
import { Check, Search, X } from "lucide-react";
import { cn } from "@/lib/cn";

const fieldBase =
  "w-full rounded-[12px] bg-surface px-3.5 text-body text-label shadow-[0_0_0_0.5px_var(--separator-strong)] outline-none transition-shadow duration-150 focus:shadow-[0_0_0_2px_var(--accent)] aria-[invalid=true]:shadow-[0_0_0_1.5px_var(--critical)]";

function FieldWrap({
  label,
  hint,
  error,
  id,
  children,
  className,
}: {
  label?: string;
  hint?: React.ReactNode;
  error?: string | null;
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={id} className="block px-1 text-subhead font-medium text-label-2">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} className="px-1 text-footnote text-critical-ink" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="px-1 text-footnote text-label-2">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type TextFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: React.ReactNode;
  error?: string | null;
  wrapClassName?: string;
};

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, id: idProp, className, wrapClassName, ...rest },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FieldWrap label={label} hint={hint} error={error} id={id} className={wrapClassName}>
      <input
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(fieldBase, "h-12", className)}
        {...rest}
      />
    </FieldWrap>
  );
});

type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: React.ReactNode;
  error?: string | null;
  autoGrow?: boolean;
  wrapClassName?: string;
  bare?: boolean;
};

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, hint, error, id: idProp, className, autoGrow = true, wrapClassName, bare, onChange, ...rest },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const inner = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => inner.current!);
  const grow = () => {
    const el = inner.current;
    if (!el || !autoGrow) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  };
  useEffect(grow);
  return (
    <FieldWrap label={label} hint={hint} error={error} id={id} className={wrapClassName}>
      <textarea
        ref={inner}
        id={id}
        aria-invalid={error ? true : undefined}
        onChange={(e) => {
          grow();
          onChange?.(e);
        }}
        className={cn(
          bare ? "w-full resize-none bg-transparent text-body outline-none" : cn(fieldBase, "min-h-28 resize-none py-3 leading-relaxed"),
          className,
        )}
        {...rest}
      />
    </FieldWrap>
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; hint?: string; error?: string | null; wrapClassName?: string }
>(function Select({ label, hint, error, id: idProp, className, children, wrapClassName, ...rest }, ref) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FieldWrap label={label} hint={hint} error={error} id={id} className={wrapClassName}>
      <div className="relative">
        <select
          ref={ref}
          id={id}
          className={cn(fieldBase, "h-12 appearance-none pr-10", className)}
          {...rest}
        >
          {children}
        </select>
        <svg aria-hidden viewBox="0 0 12 12" className="pointer-events-none absolute top-1/2 right-4 size-3 -translate-y-1/2 text-label-2">
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </FieldWrap>
  );
});

export function SearchField({
  value,
  onChange,
  placeholder = "Buscar",
  className,
  autoFocus,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-[17px] -translate-y-1/2 text-label-2" strokeWidth={2.2} />
      <input
        ref={inputRef}
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 w-full rounded-[10px] bg-fill pr-8 pl-8.5 text-body outline-none placeholder:text-label-2 focus:bg-fill-2 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label="Limpar busca"
          onClick={() => onChange("")}
          className="absolute top-1/2 right-2 flex size-[18px] -translate-y-1/2 items-center justify-center rounded-full bg-label-3 text-surface"
        >
          <X className="size-3" strokeWidth={3} />
        </button>
      )}
    </div>
  );
}

/** Interruptor acessível (role="switch"). */
export function Toggle({
  checked,
  onChange,
  label,
  disabled,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40",
        checked ? "bg-positive" : "bg-fill-2",
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 700, damping: 40 }}
        className={cn(
          "absolute top-[2px] size-[27px] rounded-full bg-white shadow-[0_3px_8px_rgb(0_0_0/0.15),0_1px_1px_rgb(0_0_0/0.16)]",
          checked ? "right-[2px]" : "left-[2px]",
        )}
      />
    </button>
  );
}

/** Controle segmentado com indicador deslizante. */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode }[];
  label: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const groupId = useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("relative flex rounded-[9px] bg-fill p-[2px]", size === "sm" ? "h-8" : "h-9", className)}
      onKeyDown={(e) => {
        const idx = options.findIndex((o) => o.value === value);
        if (e.key === "ArrowRight") onChange(options[(idx + 1) % options.length].value);
        if (e.key === "ArrowLeft") onChange(options[(idx - 1 + options.length) % options.length].value);
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative z-10 flex flex-1 items-center justify-center gap-1 rounded-[7px] px-3 font-medium whitespace-nowrap transition-colors",
              size === "sm" ? "text-footnote" : "text-subhead",
              active ? "text-label" : "text-label-2 hover:text-label",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${groupId}`}
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
                className="absolute inset-0 -z-10 rounded-[7px] bg-surface-raised shadow-[0_3px_8px_rgb(0_0_0/0.12),0_0_0_0.5px_rgb(0_0_0/0.04)] dark:bg-[#636366]"
              />
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Marcador circular, como nas listas de lembretes. */
export function CheckCircle({
  checked,
  onChange,
  label,
  tint = "var(--accent)",
  size = 22,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  tint?: string;
  size?: number;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className="press relative flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size }}
    >
      <span
        className="absolute inset-0 rounded-full transition-all duration-200"
        style={{
          boxShadow: checked ? "none" : `inset 0 0 0 1.75px var(--separator-strong)`,
          background: checked ? tint : "transparent",
        }}
      />
      {checked && (
        <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 600, damping: 26 }}>
          <Check className="relative text-white" style={{ width: size * 0.6, height: size * 0.6 }} strokeWidth={3.2} />
        </motion.span>
      )}
    </button>
  );
}
