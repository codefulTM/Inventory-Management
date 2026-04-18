import { Construction } from "lucide-react";

interface ComingSoonProps {
  title: string;
  description?: string;
}

export default function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-64 py-16">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm px-12 py-12 flex flex-col items-center text-center max-w-md w-full">
        <div className="w-16 h-16 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-center mb-6">
          <Construction size={28} className="text-amber-500" />
        </div>
        <h2 className="text-xl font-black text-gray-900 tracking-tight mb-2">{title}</h2>
        <p className="text-sm text-gray-500 font-medium mb-4">
          {description ?? "Tính năng này đang được phát triển và sẽ sớm ra mắt."}
        </p>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold rounded-full uppercase tracking-widest">
          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
          Đang phát triển
        </span>
      </div>
    </div>
  );
}
