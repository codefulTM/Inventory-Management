import { useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import {
  createImportExportOrder,
  resolveImportExportOrderScan,
  uploadImportExportOrderAttachment,
} from "../../../services/importExportOrderService";
import type {
  CreateImportExportOrderPayload,
  ImportExportAttachmentSource,
  ImportExportOrderFormValues,
  ImportExportOrderAttachment,
  ImportExportOrderItem,
  ImportExportOrderType,
} from "../../../types/importExportOrder";
import AttachmentUploader, {
  type PendingAttachment,
} from "./AttachmentUploader";
import OrderItemTable from "./OrderItemTable";
import ScanInput from "./ScanInput";

interface OrderFormProps {
  orderType: ImportExportOrderType;
  title: string;
  description: string;
}

interface SubmitFeedback {
  message: string;
  orderId?: string;
  type: "success" | "error";
}

interface SuccessDialogState {
  orderId: string;
  orderTypeLabel: string;
  warehouseId: string;
  itemCount: number;
  attachmentCount: number;
  referenceNumber?: string;
}

const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
]);

function createPendingAttachmentId(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

function createEmptyItem(): ImportExportOrderItem {
  return {
    material_id: "",
    lot_id: "",
    quantity: 1,
    unit_of_measure: "",
    expected_location: "",
  };
}

function sanitizeText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export default function OrderForm({
  orderType,
  title,
  description,
}: OrderFormProps) {
  const [feedback, setFeedback] = useState<SubmitFeedback | null>(null);
  const [isResolvingScan, setIsResolvingScan] = useState(false);
  const [scanStatusMessage, setScanStatusMessage] = useState<string | null>(
    null,
  );
  const [scanWarningMessage, setScanWarningMessage] = useState<string | null>(
    null,
  );
  const [selectedScanRow, setSelectedScanRow] = useState(0);
  const [attachmentSource, setAttachmentSource] =
    useState<ImportExportAttachmentSource>("upload");
  const [pendingAttachments, setPendingAttachments] = useState<
    PendingAttachment[]
  >([]);
  const [uploadedAttachments, setUploadedAttachments] = useState<
    ImportExportOrderAttachment[]
  >([]);
  const [attachmentValidationMessage, setAttachmentValidationMessage] =
    useState<string | null>(null);
  const [successDialog, setSuccessDialog] = useState<SuccessDialogState | null>(
    null,
  );

  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<ImportExportOrderFormValues>({
    mode: "onBlur",
    defaultValues: {
      warehouse_id: "",
      reason: "",
      reference_number: "",
      items: [createEmptyItem()],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = watch("items");

  const orderTypeLabel = useMemo(
    () => (orderType === "Inbound" ? "Phiếu nhập kho" : "Phiếu xuất kho"),
    [orderType],
  );

  const clearFeedback = () => {
    setFeedback(null);
  };

  const clearScanMessages = () => {
    setScanStatusMessage(null);
    setScanWarningMessage(null);
  };

  const addItem = () => {
    clearErrors("items");
    append(createEmptyItem());
    setSelectedScanRow(fields.length);
  };

  const removeItem = (index: number) => {
    if (fields.length <= 1) {
      setError("items", {
        type: "manual",
        message: "Cần ít nhất một dòng vật tư.",
      });
      return;
    }

    clearErrors("items");
    remove(index);

    setSelectedScanRow((previous) => {
      const nextLength = fields.length - 1;
      if (nextLength <= 0) {
        return 0;
      }

      if (index < previous) {
        return previous - 1;
      }

      if (previous >= nextLength) {
        return nextLength - 1;
      }

      return previous;
    });
  };

  const onResolveScan = async (scanCode: string, rowIndex: number) => {
    if (rowIndex < 0 || rowIndex >= fields.length) {
      return;
    }

    setIsResolvingScan(true);
    clearScanMessages();

    try {
      const result = await resolveImportExportOrderScan(scanCode);

      if (!result.resolved || !result.item) {
        setScanStatusMessage(
          result.message ?? "Không tìm thấy dữ liệu phù hợp với mã đã quét.",
        );
        return;
      }

      const item = result.item;

      if (item.material_id) {
        setValue(`items.${rowIndex}.material_id`, item.material_id, {
          shouldValidate: true,
          shouldDirty: true,
        });
      }

      setValue(`items.${rowIndex}.lot_id`, item.lot_id ?? "", {
        shouldValidate: true,
        shouldDirty: true,
      });

      if (item.unit_of_measure) {
        setValue(`items.${rowIndex}.unit_of_measure`, item.unit_of_measure, {
          shouldValidate: true,
          shouldDirty: true,
        });
      }

      setValue(
        `items.${rowIndex}.expected_location`,
        item.expected_location ?? "",
        {
          shouldValidate: true,
          shouldDirty: true,
        },
      );

      setScanStatusMessage(
        `Đã điền dữ liệu vào dòng #${rowIndex + 1} (khớp theo ${result.matched_by ?? "mã"}).`,
      );

      if (result.warnings.length > 0) {
        setScanWarningMessage(result.warnings.join("; "));
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Không thể tra mã quét. Vui lòng thử lại.";
      setScanStatusMessage(message);
    } finally {
      setIsResolvingScan(false);
    }
  };

  const onPickAttachmentFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      return;
    }

    const accepted: PendingAttachment[] = [];
    const rejectedMessages: string[] = [];

    Array.from(fileList).forEach((file) => {
      if (!ALLOWED_ATTACHMENT_MIME_TYPES.has(file.type)) {
        rejectedMessages.push(
          `${file.name}: sai định dạng (chỉ nhận JPG, PNG, PDF).`,
        );
        return;
      }

      if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        rejectedMessages.push(`${file.name}: vượt quá 5MB.`);
        return;
      }

      accepted.push({
        id: createPendingAttachmentId(),
        file,
      });
    });

    if (accepted.length > 0) {
      setPendingAttachments((previous) => [...previous, ...accepted]);
    }

    if (rejectedMessages.length > 0) {
      setAttachmentValidationMessage(rejectedMessages.join(" "));
      return;
    }

    setAttachmentValidationMessage(null);
  };

  const onRemovePendingAttachment = (id: string) => {
    setPendingAttachments((previous) =>
      previous.filter((attachment) => attachment.id !== id),
    );
  };

  const buildPayload = (
    values: ImportExportOrderFormValues,
  ): CreateImportExportOrderPayload => {
    const normalizedItems: ImportExportOrderItem[] = values.items.map(
      (item) => ({
        material_id: item.material_id.trim(),
        lot_id: sanitizeText(item.lot_id ?? ""),
        quantity: Number(item.quantity),
        unit_of_measure: item.unit_of_measure.trim(),
        expected_location: sanitizeText(item.expected_location ?? ""),
      }),
    );

    return {
      order_type: orderType,
      warehouse_id: values.warehouse_id.trim(),
      reason: sanitizeText(values.reason),
      reference_number: sanitizeText(values.reference_number),
      items: normalizedItems,
    };
  };

  const resetForm = () => {
    reset({
      warehouse_id: "",
      reason: "",
      reference_number: "",
      items: [createEmptyItem()],
    });
    clearErrors();
    clearFeedback();
    clearScanMessages();
    setPendingAttachments([]);
    setUploadedAttachments([]);
    setAttachmentValidationMessage(null);
    setSelectedScanRow(0);
    setAttachmentSource("upload");
    setSuccessDialog(null);
  };

  const onSubmit = async (values: ImportExportOrderFormValues) => {
    clearFeedback();
    clearScanMessages();
    setAttachmentValidationMessage(null);

    if (!values.items?.length) {
      setError("items", {
        type: "manual",
        message: "Cần ít nhất một dòng vật tư.",
      });
      return;
    }

    try {
      const payload = buildPayload(values);
      const created = await createImportExportOrder(payload);
      let latestOrder = created;

      if (pendingAttachments.length > 0) {
        for (const attachment of pendingAttachments) {
          latestOrder = await uploadImportExportOrderAttachment(
            created.order_id,
            {
              file: attachment.file,
              source: attachmentSource,
            },
          );
        }
      }

      setUploadedAttachments(latestOrder.attachments ?? []);
      setSuccessDialog({
        orderId: created.order_id,
        orderTypeLabel,
        warehouseId: payload.warehouse_id,
        itemCount: payload.items.length,
        attachmentCount: latestOrder.attachments?.length ?? 0,
        referenceNumber: payload.reference_number,
      });

      reset({
        warehouse_id: "",
        reason: "",
        reference_number: "",
        items: [createEmptyItem()],
      });
      clearErrors();
      setPendingAttachments([]);
      setAttachmentValidationMessage(null);
      setSelectedScanRow(0);
      setAttachmentSource("upload");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Không thể tạo phiếu. Vui lòng thử lại.";
      setFeedback({
        type: "error",
        message,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="space-y-6">
        <header className="rounded-lg bg-linear-to-br from-blue-600 to-blue-700 px-5 py-6 text-white shadow-md">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-100">
            Operator / US24
          </p>
          <h1 className="mt-2 text-3xl font-black">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-blue-100">{description}</p>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <section className="rounded-lg bg-white p-5 shadow-md">
            <h2 className="mb-4 text-lg font-black text-gray-800">
              Thông tin phiếu
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-500">
                Loại phiếu
                <input
                  value={orderTypeLabel}
                  readOnly
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700"
                />
              </label>

              <label className="block text-xs font-bold uppercase tracking-wide text-gray-500">
                Warehouse ID *
                <input
                  {...register("warehouse_id", {
                    required: "Warehouse ID là bắt buộc.",
                  })}
                  placeholder="VD: WH-HN-01"
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                {errors.warehouse_id ? (
                  <p className="mt-1 text-xs font-semibold text-red-600">
                    {errors.warehouse_id.message}
                  </p>
                ) : null}
              </label>

              <label className="block text-xs font-bold uppercase tracking-wide text-gray-500">
                Số tham chiếu
                <input
                  {...register("reference_number")}
                  placeholder="VD: REF-2026-001"
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 md:col-span-2 xl:col-span-1">
                Lý do
                <input
                  {...register("reason")}
                  placeholder="Mô tả ngắn mục đích nhập/xuất"
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>
          </section>

          <OrderItemTable
            fields={fields}
            register={register}
            errors={errors}
            disabled={isSubmitting}
            onAddItem={addItem}
            onRemoveItem={removeItem}
          />

          <ScanInput
            disabled={isSubmitting}
            isResolving={isResolvingScan}
            rowOptions={fields.map((_, index) => ({
              value: index,
              label: `Dòng #${index + 1} (${watchedItems?.[index]?.material_id?.trim() || "chưa có mã"})`,
            }))}
            selectedRow={selectedScanRow}
            onSelectedRowChange={setSelectedScanRow}
            onResolve={onResolveScan}
            statusMessage={scanStatusMessage ?? undefined}
            warningMessage={scanWarningMessage ?? undefined}
          />

          <AttachmentUploader
            disabled={isSubmitting}
            source={attachmentSource}
            onSourceChange={setAttachmentSource}
            pendingFiles={pendingAttachments}
            uploadedFiles={uploadedAttachments}
            validationMessage={attachmentValidationMessage ?? undefined}
            onPickFiles={onPickAttachmentFiles}
            onRemovePending={onRemovePendingAttachment}
          />

          {errors.items?.message ? (
            <p className="text-sm font-semibold text-red-600">
              {errors.items.message}
            </p>
          ) : null}

          {feedback?.type === "error" ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              <p>{feedback.message}</p>
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={resetForm}
              disabled={isSubmitting}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Làm mới
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Đang tạo phiếu..." : "Tạo phiếu"}
            </button>
          </div>
        </form>

        {successDialog ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl">
              <div className="rounded-t-2xl bg-emerald-600 px-5 py-4 text-white">
                <h3 className="text-lg font-black">Tạo phiếu thành công</h3>
                <p className="mt-1 text-sm text-emerald-100">
                  Dữ liệu phiếu đã được lưu vào hệ thống.
                </p>
              </div>

              <div className="space-y-3 px-5 py-4 text-sm text-gray-700">
                <div className="grid grid-cols-2 gap-3">
                  <p>
                    <span className="font-semibold text-gray-500">
                      Mã phiếu:
                    </span>{" "}
                    <span className="font-bold text-gray-900">
                      {successDialog.orderId}
                    </span>
                  </p>
                  <p>
                    <span className="font-semibold text-gray-500">
                      Loại phiếu:
                    </span>{" "}
                    <span className="font-bold text-gray-900">
                      {successDialog.orderTypeLabel}
                    </span>
                  </p>
                  <p>
                    <span className="font-semibold text-gray-500">
                      Warehouse:
                    </span>{" "}
                    <span className="font-bold text-gray-900">
                      {successDialog.warehouseId}
                    </span>
                  </p>
                  <p>
                    <span className="font-semibold text-gray-500">
                      Số dòng vật tư:
                    </span>{" "}
                    <span className="font-bold text-gray-900">
                      {successDialog.itemCount}
                    </span>
                  </p>
                  <p>
                    <span className="font-semibold text-gray-500">
                      Số chứng từ:
                    </span>{" "}
                    <span className="font-bold text-gray-900">
                      {successDialog.attachmentCount}
                    </span>
                  </p>
                  <p>
                    <span className="font-semibold text-gray-500">
                      Trạng thái:
                    </span>{" "}
                    <span className="font-bold text-amber-700">
                      PendingConfirmation
                    </span>
                  </p>
                </div>

                {successDialog.referenceNumber ? (
                  <p>
                    <span className="font-semibold text-gray-500">
                      Số tham chiếu:
                    </span>{" "}
                    <span className="font-bold text-gray-900">
                      {successDialog.referenceNumber}
                    </span>
                  </p>
                ) : null}
              </div>

              <div className="flex justify-end border-t border-gray-100 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setSuccessDialog(null)}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
