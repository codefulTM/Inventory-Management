/**
 * useMaterialForm Hook - Quản lý form tạo/cập nhật vật tư
 * 
 * Chức năng:
 * - Quản lý state form (formData): material_id, part_number, material_name, ...
 * - Validate form: Kiểm tra độ dài, required, enum types
 * - Xử lý submit: Tạo mới (create) hoặc Cập nhật (update)
 * - Hiển thị lỗi validation theo từng field (errors)
 * - Reset form, Clear success state
 * - Hiển thị thông báo qua antd message (thành công/thất bại)
 * 
 * @param onSuccess - Callback khi tạo/cập nhật thành công
 * @returns Object chứa: formData, errors, loading, error, success, 
 *          setFormData, setFieldValue, resetForm, submit, submitUpdate, validateForm, clearSuccess
 */
import { useState, useCallback } from "react";
import { message } from "antd";
import type {
  Material,
  CreateMaterialRequest,
  UpdateMaterialRequest,
  MaterialType,
} from "../types/material";
import { materialService } from "../services/material.service";

/**
 * Map lỗi theo field name (key-value)
 * Ví dụ: { material_name: "Material Name is required" }
 */
interface FormErrors {
  [key: string]: string;
}

/**
 * Interface trả về từ useMaterialForm hook
 */
interface UseMaterialFormReturn {
  formData: CreateMaterialRequest;      // Dữ liệu form hiện tại
  errors: FormErrors;                   // Lỗi validation theo field
  loading: boolean;                     // Đang xử lý
  error: Error | null;                  // Lỗi API
  success: boolean;                     // Thành công
  setFormData: (data: Partial<CreateMaterialRequest>) => void; // Đặt dữ liệu form
  setFieldValue: (field: keyof CreateMaterialRequest, value: string | MaterialType) => void; // Đặt giá trị 1 field
  resetForm: () => void;                // Reset form về trạng thái ban đầu
  submit: () => Promise<Material | null>;    // Tạo vật tư mới
  submitUpdate: (id: string) => Promise<Material | null>; // Cập nhật vật tư
  validateForm: () => boolean;          // Validate form, trả true nếu hợp lệ
  clearSuccess: () => void;             // Xóa trạng thái success
}

/**
 * Dữ liệu form ban đầu (khi tạo mới)
 */
const initialFormData: CreateMaterialRequest = {
  material_id: "",
  part_number: "",
  material_name: "",
  material_type: "API",
  storage_conditions: "",
  specification_document: "",
};

/**
 * Validate form data
 * @param data - Dữ liệu form cần validate
 * @returns FormErrors - Map lỗi theo field name (rỗng nếu hợp lệ)
 * 
 * Các quy tắc:
 * - material_id: Tối đa 20 ký tự (không bắt buộc)
 * - part_number: Bắt buộc, tối đa 20 ký tự
 * - material_name: Bắt buộc, tối đa 100 ký tự
 * - material_type: Phải là 1 trong 6 loại: API, Excipient, Dietary Supplement, Container, Closure, Process Chemical, Testing Material
 * - storage_conditions: Tối đa 100 ký tự (tùy chọn)
 * - specification_document: Tối đa 50 ký tự (tùy chọn)
 */
const validateForm = (data: CreateMaterialRequest): FormErrors => {
  const errors: FormErrors = {};

  // Validate material_id (tùy chọn, nếu có thì tối đa 20 chars)
  if (data.material_id && data.material_id.length > 20) {
    errors.material_id = "Material ID must be 20 characters or less";
  }

  // Validate part_number (bắt buộc)
  if (!data.part_number.trim()) {
    errors.part_number = "Part Number is required";
  } else if (data.part_number.length > 20) {
    errors.part_number = "Part Number must be 20 characters or less";
  }

  // Validate material_name (bắt buộc)
  if (!data.material_name.trim()) {
    errors.material_name = "Material Name is required";
  } else if (data.material_name.length > 100) {
    errors.material_name = "Material Name must be 100 characters or less";
  }

  // Validate material_type (phải là enum hợp lệ)
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

  // Validate storage_conditions (tùy chọn, tối đa 100 chars)
  if (data.storage_conditions && data.storage_conditions.length > 100) {
    errors.storage_conditions =
      "Storage conditions must be 100 characters or less";
  }

  // Validate specification_document (tùy chọn, tối đa 50 chars)
  if (data.specification_document && data.specification_document.length > 50) {
    errors.specification_document =
      "Specification document must be 50 characters or less";
  }

  return errors;
};

export const useMaterialForm = (
  onSuccess?: (material: Material) => void,
): UseMaterialFormReturn => {
  // State quản lý form
  const [formData, setFormDataState] =
    useState<CreateMaterialRequest>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [success, setSuccess] = useState(false);

  // Đặt toàn bộ dữ liệu form (partial update)
  const setFormData = useCallback((data: Partial<CreateMaterialRequest>) => {
    setFormDataState((prev) => ({ ...prev, ...data }));
    setErrors({}); // Clear errors when user modifies form
  }, []);

  // Đặt giá trị cho 1 field cụ thể
  const setFieldValue = useCallback(
    (field: keyof CreateMaterialRequest, value: string | MaterialType) => {
      setFormDataState((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => ({ ...prev, [field]: "" })); // Clear specific field error
    },
    [],
  );

  // Reset form về trạng thái ban đầu
  const resetForm = useCallback(() => {
    setFormDataState(initialFormData);
    setErrors({});
    setError(null);
    setSuccess(false);
  }, []);

  // Validate form và trả về boolean
  const validateFormAndReturn = useCallback((): boolean => {
    const formErrors = validateForm(formData);
    setErrors(formErrors);
    return Object.keys(formErrors).length === 0;
  }, [formData]);

  // Submit tạo mới vật tư
  const submit = useCallback(async (): Promise<Material | null> => {
    if (!validateFormAndReturn()) {
      return null; // Form invalid
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const material = await materialService.create(formData);
      setSuccess(true);
      message.success("Tạo vật tư thành công!");

      if (onSuccess) {
        onSuccess(material);
      }

      resetForm(); // Reset form sau khi tạo thành công
      return material;
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error("Failed to create material. Please try again.");
      setError(error);
      console.error("[useMaterialForm] Create failed:", error);
      message.error(error.message || "Tạo vật tư thất bại");
      return null;
    } finally {
      setLoading(false);
    }
  }, [formData, validateFormAndReturn, onSuccess, resetForm]);

  // Submit cập nhật vật tư
  const submitUpdate = useCallback(
    async (id: string): Promise<Material | null> => {
      if (!validateFormAndReturn()) {
        return null;
      }

      try {
        setLoading(true);
        setError(null);
        setSuccess(false);

        // Convert CreateMaterialRequest to UpdateMaterialRequest (exclude material_id & part_number)
        const { material_id, part_number, ...updateData } = formData as any;
        const material = await materialService.update(
          id,
          updateData as UpdateMaterialRequest,
        );
        setSuccess(true);
        message.success("Cập nhật vật tư thành công!");

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
        message.error(error.message || "Cập nhật vật tư thất bại");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [formData, validateFormAndReturn, onSuccess, resetForm],
  );

  // Xóa trạng thái success (dùng khi đóng modal)
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
