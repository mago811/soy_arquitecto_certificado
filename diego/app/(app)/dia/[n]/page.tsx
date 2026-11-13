import { notFound } from "next/navigation";
import { DayView } from "@/components/DayView";
import { currentPlanDay } from "@/lib/dates";

export default async function Dia({ params }: { params: Promise<{ n: string }> }) {
  const n = Number((await params).n);
  if (!Number.isInteger(n) || n < 1 || n > 15) notFound();
  return <DayView n={n} isToday={n === currentPlanDay()} />;
}
