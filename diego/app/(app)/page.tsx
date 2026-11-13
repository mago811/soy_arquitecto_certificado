import { DayView } from "@/components/DayView";
import { currentPlanDay } from "@/lib/dates";

export default function Hoy() {
  return <DayView n={currentPlanDay()} isToday />;
}
