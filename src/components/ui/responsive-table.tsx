import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

export type ResponsiveColumn<T> = {
  key: string;
  label: string;
  hideOnMobile?: boolean;
  className?: string;
  render: (row: T) => ReactNode;
};

export function ResponsiveTable<T>({
  columns,
  rows,
  getRowKey,
  maxHeight = "70vh",
  empty,
}: {
  columns: ResponsiveColumn<T>[];
  rows: T[];
  getRowKey: (row: T, index: number) => string | number;
  maxHeight?: string;
  empty?: ReactNode;
}) {
  const [showAll, setShowAll] = useState(false);
  const hasHidden = columns.some((c) => c.hideOnMobile);

  return (
    <div className="w-full">
      {hasHidden && (
        <div className="mb-2 flex justify-end sm:hidden">
          <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)} className="h-8 text-xs">
            {showAll ? <><ChevronUp className="mr-1 h-3 w-3" />Menos colunas</> : <><ChevronDown className="mr-1 h-3 w-3" />Mais colunas</>}
          </Button>
        </div>
      )}
      <div className="overflow-x-auto rounded-md border border-border/60" style={{ maxHeight }}>
        <table className="w-full text-xs sm:text-sm">
          <thead className="sticky top-0 z-[1] bg-muted/60 backdrop-blur">
            <tr className="border-b">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`p-2 text-left font-medium text-muted-foreground ${c.className ?? ""} ${
                    c.hideOnMobile && !showAll ? "hidden sm:table-cell" : ""
                  }`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-6 text-center text-muted-foreground">
                  {empty ?? "Nenhum registro encontrado."}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={getRowKey(row, i)} className="border-b last:border-0 hover:bg-muted/30">
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={`p-2 align-middle ${c.className ?? ""} ${
                        c.hideOnMobile && !showAll ? "hidden sm:table-cell" : ""
                      }`}
                    >
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
