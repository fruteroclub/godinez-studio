/**
 * Form validation utilities with Spanish error messages
 */

export type ValidationResult = {
  valid: boolean;
  errors: Record<string, string>;
};

export type Validator<T> = (value: T) => string | null;

/**
 * Common validators
 */
export const validators = {
  required: (fieldName: string): Validator<string> => (value) => {
    if (!value || value.trim() === "") {
      return `El campo "${fieldName}" es obligatorio`;
    }
    return null;
  },

  minLength: (fieldName: string, min: number): Validator<string> => (value) => {
    if (value && value.length < min) {
      return `"${fieldName}" debe tener al menos ${min} caracteres`;
    }
    return null;
  },

  maxLength: (fieldName: string, max: number): Validator<string> => (value) => {
    if (value && value.length > max) {
      return `"${fieldName}" no puede tener más de ${max} caracteres`;
    }
    return null;
  },

  url: (fieldName: string): Validator<string> => (value) => {
    if (!value) return null;
    try {
      new URL(value);
      return null;
    } catch {
      return `"${fieldName}" debe ser una URL válida`;
    }
  },

  date: (fieldName: string): Validator<string | Date> => (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return `"${fieldName}" debe ser una fecha válida`;
    }
    return null;
  },

  futureDate: (fieldName: string): Validator<string | Date> => (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return `"${fieldName}" debe ser una fecha válida`;
    }
    if (date <= new Date()) {
      return `"${fieldName}" debe ser una fecha futura`;
    }
    return null;
  },
};

/**
 * Validate hackathon form data
 */
export function validateHackathonForm(data: {
  name: string;
  deadline: string;
  hackathonUrl?: string;
  resourcesUrl?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  // Name validation
  const nameRequired = validators.required("Nombre")(data.name);
  if (nameRequired) errors.name = nameRequired;
  
  const nameMin = validators.minLength("Nombre", 3)(data.name);
  if (!errors.name && nameMin) errors.name = nameMin;
  
  const nameMax = validators.maxLength("Nombre", 100)(data.name);
  if (!errors.name && nameMax) errors.name = nameMax;

  // Deadline validation
  const deadlineRequired = validators.required("Fecha límite")(data.deadline);
  if (deadlineRequired) errors.deadline = deadlineRequired;
  
  const deadlineFuture = validators.futureDate("Fecha límite")(data.deadline);
  if (!errors.deadline && deadlineFuture) errors.deadline = deadlineFuture;

  // Optional URL validations
  if (data.hackathonUrl) {
    const urlError = validators.url("URL del hackathon")(data.hackathonUrl);
    if (urlError) errors.hackathonUrl = urlError;
  }

  if (data.resourcesUrl) {
    const urlError = validators.url("URL de recursos")(data.resourcesUrl);
    if (urlError) errors.resourcesUrl = urlError;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate workspace form data
 */
export function validateWorkspaceForm(data: {
  name: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  const nameRequired = validators.required("Nombre")(data.name);
  if (nameRequired) errors.name = nameRequired;
  
  const nameMin = validators.minLength("Nombre", 2)(data.name);
  if (!errors.name && nameMin) errors.name = nameMin;
  
  const nameMax = validators.maxLength("Nombre", 50)(data.name);
  if (!errors.name && nameMax) errors.name = nameMax;

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
