import { useState, useCallback, useMemo } from "react";

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
}

export interface ValidationRules {
  [field: string]: ValidationRule;
}

export interface ValidationErrors {
  [field: string]: string | null;
}

/**
 * Hook for form validation with real-time feedback
 */
export function useFormValidation<T extends Record<string, string>>(
  initialValues: T,
  rules: ValidationRules
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Validate a single field
  const validateField = useCallback(
    (field: string, value: string): string | null => {
      const rule = rules[field];
      if (!rule) return null;

      if (rule.required && !value.trim()) {
        return "Este campo es obligatorio";
      }

      if (rule.minLength && value.length < rule.minLength) {
        return `Mínimo ${rule.minLength} caracteres`;
      }

      if (rule.maxLength && value.length > rule.maxLength) {
        return `Máximo ${rule.maxLength} caracteres`;
      }

      if (rule.pattern && !rule.pattern.test(value)) {
        return "Formato inválido";
      }

      if (rule.custom) {
        return rule.custom(value);
      }

      return null;
    },
    [rules]
  );

  // Handle field change
  const handleChange = useCallback(
    (field: keyof T) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setValues((prev) => ({ ...prev, [field]: value }));

      // Validate on change if field was touched
      if (touched[field as string]) {
        const error = validateField(field as string, value);
        setErrors((prev) => ({ ...prev, [field]: error }));
      }
    },
    [touched, validateField]
  );

  // Handle field blur (mark as touched)
  const handleBlur = useCallback(
    (field: keyof T) => () => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      const error = validateField(field as string, values[field]);
      setErrors((prev) => ({ ...prev, [field]: error }));
    },
    [values, validateField]
  );

  // Validate all fields
  const validateAll = useCallback((): boolean => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    for (const field of Object.keys(rules)) {
      const error = validateField(field, values[field as keyof T] || "");
      newErrors[field] = error;
      if (error) isValid = false;
    }

    setErrors(newErrors);
    setTouched(
      Object.keys(rules).reduce((acc, field) => ({ ...acc, [field]: true }), {})
    );

    return isValid;
  }, [rules, values, validateField]);

  // Reset form
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  // Check if form is valid (memoized)
  const isValid = useMemo(() => {
    return Object.values(errors).every((e) => e === null) &&
           Object.keys(rules).every((field) => {
             const rule = rules[field];
             if (rule.required) {
               return values[field as keyof T]?.trim();
             }
             return true;
           });
  }, [errors, rules, values]);

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    reset,
    isValid,
    setValues,
  };
}

/**
 * Validation rules for hackathon form
 */
export const hackathonFormRules: ValidationRules = {
  name: {
    required: true,
    minLength: 1,
    maxLength: 255,
  },
  deadline: {
    required: true,
    custom: (value) => {
      if (!value) return "La fecha límite es obligatoria";
      const date = new Date(value);
      if (isNaN(date.getTime())) return "Fecha inválida";
      if (date < new Date()) return "La fecha debe ser en el futuro";
      return null;
    },
  },
  hackathonUrl: {
    pattern: /^(https?:\/\/)?[\w-]+(\.[\w-]+)+[/#?]?.*$/,
    custom: (value) => {
      if (value && !value.startsWith("http")) {
        return "La URL debe empezar con http:// o https://";
      }
      return null;
    },
  },
  resourcesUrl: {
    pattern: /^(https?:\/\/)?[\w-]+(\.[\w-]+)+[/#?]?.*$/,
    custom: (value) => {
      if (value && !value.startsWith("http")) {
        return "La URL debe empezar con http:// o https://";
      }
      return null;
    },
  },
};

/**
 * Validation rules for note input
 */
export const noteFormRules: ValidationRules = {
  note: {
    required: true,
    minLength: 1,
    maxLength: 1000,
  },
};
