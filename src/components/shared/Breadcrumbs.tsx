import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  /** Omit for the current page — renders as muted, non-interactive text. */
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Small, reusable breadcrumb trail. The last item is always treated as the
 * current page (never a link) and is the only segment allowed to shrink +
 * truncate, so long product/page names don't push earlier crumbs off screen.
 */
export default function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={`min-w-0 ${className}`}>
      <ol className="flex items-center text-xs text-gray-500 sm:text-sm">
        {items.map((item, index) => {
          const isFirst = index === 0;
          const isLast = index === items.length - 1;

          return (
            <li
              key={`${item.label}-${index}`}
              className={`flex min-w-0 items-center ${
                isLast ? "flex-1" : "max-w-[40%] shrink-0"
              }`}
            >
              {!isFirst && (
                <ChevronRight
                  size={14}
                  className="mx-1.5 shrink-0 text-gray-300"
                  aria-hidden="true"
                />
              )}

              {item.href && !isLast ? (
                <Link href={item.href} className="truncate transition hover:text-brand">
                  {item.label}
                </Link>
              ) : (
                <span
                  className="truncate text-gray-400"
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
