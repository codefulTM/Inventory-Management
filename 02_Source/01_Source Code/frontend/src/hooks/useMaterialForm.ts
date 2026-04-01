/**
 * useMaterialForm Hook
 * Manages form state for creating and updating materials
 */

import { useState, useCallback } from "react";
import type {
  Material,
  CreateMaterialRequest,
  UpdateMaterialRequest,
  MaterialType,
} from "../types/Material";
import { materialService } from "../services/material.service";

interface FormErrors {
  [key: string]: string;
}

interface UseMaterialFormReturn {
  formData: CreateMaterialRequest;
  errors: FormErrors;
  loading: boolean;
  error: Error | null;
  success: boolean;
  setFormData: (data: Partial<CreateMaterialRequest>) => void;
  setFieldValue: (
    field: keyof CreateMaterialRequest,
    value: string | MaterialType,
  ) => void;
  resetForm: () => void;
  submit: () => Promise<Material | null>;
  submitUpdate: (id: string) => Promise<Material | null>;
  validateForm: () => boolean;
  clearSuccess: () => void;
}

const initialFormData: CreateMaterialRequest = {
  material_id: "",
  part_number: "",
  material_name: "",
  material_type: "API",
  storage_conditions: "",
  specification_document: "",
};

const validateForm = (data: CreateMaterialRequest): FormErrors => {
  const errors: FormErrors = {};

  // Validate material_id (1-20 chars, required)
  if (!data.material_id.trim()) {
    errors.material_id = "Material ID is required";
  } else if (data.material_id.length > 20) {
    errors.material_id = "Material ID must be 20 characters or less";
  }

  // Validate part_number (1-20 chars, required)
  if (!data.part_number.trim()) {
    errors.part_number = "Part Number is required";
  } else if (data.part_number.length > 20) {
    errors.part_number = "Part Number must be 20 characters or less";
  }

  // Validate material_name (1-100 chars, required)
  if (!data.material_name.trim()) {
    errors.material_name = "Material Name is required";
  } else if (data.material_name.length > 100) {
    errors.material_name = "Material Name must be 100 characters or less";
  }

  // Validate material_type (enum)
  const validTypes: MaterialType[] = [
    "API",
    "Excipient",
    "Dietary Supplement",
    "Container",
    "Closure",
    "Process Chemical",
    "Testing Material",
  ];
  if (!validTypes.includes(data.material_type as MaterialType)) {
    errors.material_type = "Invalid material type";
  }

  // Validate storage_conditions (optional, max 100 chars)
  if (data.storage_conditions && data.storage_conditions.length > 100) {
    errors.storage_conditions =
      "Storage conditions must be 100 characters or less";
  }

  // Validate specification_document (optional, max 50 chars)
  if (data.specification_document && data.specification_document.length > 50) {
    errors.specification_document =
      "Specification document must be 50 characters or less";
  }

  return errors;
};

export const useMaterialForm = (
  onSuccess?: (material: Material) => void,
): UseMaterialFormReturn => {
  const [formData, setFormDataState] =
    useState<CreateMaterialRequest>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [success, setSuccess] = useState(false);

  const setFormData = useCallback((data: Partial<CreateMaterialRequest>) => {
    setFormDataState((prev) => ({ ...prev, ...data }));
    setErrors({}); // Clear errors when user modifies form
  }, []);

  const setFieldValue = useCallback(
    (field: keyof CreateMaterialRequest, value: string | MaterialType) => {
      setFormDataState((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => ({ ...prev, [field]: "" })); // Clear specific field error
    },
    [],
  );

  const resetForm = useCallback(() => {
    setFormDataState(initialFormData);
    setErrors({});
    setError(null);
    setSuccess(false);
  }, []);

  const validateFormAndReturn = useCallback((): boolean => {
    const formErrors = validateForm(formData);
    setErrors(formErrors);
    return Object.keys(formErrors).length === 0;
  }, [formData]);

  const submit = useCallback(async (): Promise<Material | null> => {
    if (!validateFormAndReturn()) {
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const material = await materialService.create(formData);
      setSuccess(true);

      if (onSuccess) {
        onSuccess(material);
      }

      resetForm();
      return material;
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error("Failed to create material. Please try again.");
      setError(error);
      console.error("[useMaterialForm] Create failed:", error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [formData, validateFormAndReturn, onSuccess, resetForm]);

  const submitUpdate = useCallback(
    async (id: string): Promise<Material | null> => {
      if (!validateFormAndReturn()) {
        return null;
      }

      try {
        setLoading(true);
        setError(null);
        setSuccess(false);

        // Convert CreateMaterialRequest to UpdateMaterialRequest (exclude material_id)
        const { material_id, ...updateData } = formData;
        const material = await materialService.update(
          id,
          updateData as UpdateMaterialRequest,
        );
        setSuccess(true);

        if (onSuccess) {
          onSuccess(material);
        }

        resetForm();
        return material;
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : new Error("Failed to update material. Please try again.");
        setError(error);
        console.error("[useMaterialForm] Update failed:", error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [formData, validateFormAndReturn, onSuccess, resetForm],
  );

  const clearSuccess = useCallback(() => {
    setSuccess(false);
  }, []);

  return {
    formData,
    errors,
    loading,
    error,
    success,
    setFormData,
    setFieldValue,
    resetForm,
    submit,
    submitUpdate,
    validateForm: validateFormAndReturn,
    clearSuccess,
  };
};
