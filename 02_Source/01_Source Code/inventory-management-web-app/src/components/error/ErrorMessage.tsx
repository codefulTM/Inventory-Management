type ErrorMessageProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
};

export default function ErrorMessage({
  title = 'Something went wrong',
  message,
  onRetry,
}: ErrorMessageProps) {
  return (
    <div className="mx-auto my-6 max-w-xl rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide">{title}</h3>
      <p className="text-sm">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded bg-red-700 px-3 py-1 text-sm font-medium text-white hover:bg-red-800"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
