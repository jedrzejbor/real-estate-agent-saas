import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ReportSectionCardProps {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}

export function ReportSectionCard({
  title,
  description,
  children,
  className,
}: ReportSectionCardProps) {
  return (
    <Card className={cn('rounded-2xl border border-border shadow-sm', className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
