import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  touched?: boolean;
  hint?: string;
}

/**
 * Input component with validation state styling
 */
export const ValidatedInput = forwardRef<HTMLInputElement, ValidatedInputProps>(
  ({ label, error, touched, hint, className, ...props }, ref) => {
    const showError = touched && error;
    const showSuccess = touched && !error && props.value;

    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-[hsl(var(--foreground))]">
            {label}
            {props.required && <span className="text-red-400 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            className={cn(
              "w-full rounded-lg border bg-[hsl(var(--background))] px-3 py-2 text-sm transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-offset-0",
              showError && "border-red-500 focus:ring-red-500/30",
              showSuccess && "border-emerald-500 focus:ring-emerald-500/30",
              !showError && !showSuccess && "border-[hsl(var(--border))] focus:ring-magenta/30",
              className
            )}
            {...props}
          />
          {/* Status icon */}
          {touched && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {showError && (
                <span className="text-red-400">✕</span>
              )}
              {showSuccess && (
                <span className="text-emerald-400">✓</span>
              )}
            </div>
          )}
        </div>
        {/* Error message */}
        {showError && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <span>⚠</span> {error}
          </p>
        )}
        {/* Hint */}
        {hint && !showError && (
          <p className="text-xs text-[hsl(var(--muted-foreground))]">{hint}</p>
        )}
      </div>
    );
  }
);

ValidatedInput.displayName = "ValidatedInput";
