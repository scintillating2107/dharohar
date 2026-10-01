import Link from "next/link";
import { cn } from "@/lib/utils";

export function RecordIdLink({
  recordId,
  className,
}: {
  recordId: string;
  className?: string;
}) {
  return (
    <Link
      href={`/records/${recordId}`}
      className={cn(
        "font-mono font-bold text-[var(--gov-navy-light)] hover:text-[var(--gov-saffron)] hover:underline",
        className
      )}
    >
      {recordId}
    </Link>
  );
}
