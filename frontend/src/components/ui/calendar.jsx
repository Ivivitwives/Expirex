import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, useNavigation } from "react-day-picker"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function CalendarCaption({ displayMonth }) {
  const { goToMonth, nextMonth, previousMonth } = useNavigation()

  return (
    <div className="space-y-3 px-2 py-1">
      {/* Month Navigation */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => previousMonth && goToMonth(previousMonth)}
          disabled={!previousMonth}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "h-6 w-6 p-0 text-popover-foreground"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 text-center">
          <span className="text-sm font-semibold text-popover-foreground">
            {format(displayMonth, "MMMM")}
          </span>
        </div>
        <button
          type="button"
          onClick={() => nextMonth && goToMonth(nextMonth)}
          disabled={!nextMonth}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "h-6 w-6 p-0 text-popover-foreground"
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Year Navigation */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => previousMonth && goToMonth(new Date(displayMonth.getFullYear() - 1, 0))}
          disabled={!previousMonth}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "h-6 w-6 p-0 text-popover-foreground"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 text-center">
          <span className="text-sm font-semibold text-popover-foreground">
            {format(displayMonth, "yyyy")}
          </span>
        </div>
        <button
          type="button"
          onClick={() => nextMonth && goToMonth(new Date(displayMonth.getFullYear() + 1, 0))}
          disabled={!nextMonth}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "h-6 w-6 p-0 text-popover-foreground"
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}) {
  const currentYear = new Date().getFullYear();
  const fromMonth = new Date(currentYear - 10, 0, 1);
  const toMonth = new Date(currentYear + 10, 11, 31);

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      fromMonth={fromMonth}
      toMonth={toMonth}
      className={cn("rounded-xl border bg-popover p-3 shadow-md", className)}
      classNames={{
        months: "flex flex-col space-y-4",
        month: "space-y-4",
        caption: "relative",
        caption_label: "sr-only",
        nav: "sr-only",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 border-border bg-transparent p-0 text-foreground/80 opacity-70 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected].day-range-end)]:rounded-r-md",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
            : "[&:has([aria-selected])]:rounded-md"
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 rounded-md p-0 font-normal text-foreground aria-selected:opacity-100"
        ),
        day_range_start: "day-range-start",
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Caption: CalendarCaption,
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("h-4 w-4", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("h-4 w-4", className)} {...props} />
        ),
      }}
      {...props} />
  );
}
Calendar.displayName = "Calendar"

export { Calendar }
