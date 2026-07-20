import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function SkeletonCard() {
  return (
    <Card>
      <CardHeader className="gap-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-12 w-full" />
      </CardContent>
    </Card>
  );
}

export function SkeletonTable() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}

export function ResponsiveTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        {children}
      </table>
    </div>
  );
}
