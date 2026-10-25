import { useTranslation } from "react-i18next";
import { Badge } from "../ui/badge";

const statusClasses: Record<string, string> = {
  created:
    "border-[#b8c8ff] bg-[#edf1ff] text-[#334b9a] dark:border-[#465a9e] dark:bg-[#202d59] dark:text-[#c3d0ff]",
  pending:
    "border-[#f2cf88] bg-[#fff6df] text-[#79520a] dark:border-[#80621f] dark:bg-[#453817] dark:text-[#ffe19a]",
  in_progress:
    "border-[#a1d7c3] bg-[#e4f5ee] text-[#176344] dark:border-[#28684f] dark:bg-[#173d30] dark:text-[#a7ebce]",
  completed:
    "border-[#d2d5dc] bg-[#f0f1f4] text-[#4d5562] dark:border-[#4e5563] dark:bg-[#303540] dark:text-[#d2d6df]",
  paid: "border-[#94d3a2] bg-[#e6f7e9] text-[#1f6630] dark:border-[#2b7040] dark:bg-[#183b22] dark:text-[#a7e4b2]",
};

export function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  return (
    <Badge
      className={`whitespace-nowrap px-[0.5625rem] ${statusClasses[status] ?? ""}`}
    >
      {t(`status_${status}`, { defaultValue: status })}
    </Badge>
  );
}
