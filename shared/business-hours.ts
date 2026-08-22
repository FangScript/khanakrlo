export type BusinessHoursWindow = {
  weekday: number;
  opensAt: string | null;
  closesAt: string | null;
  isClosed: boolean;
};

const WEEKDAY_BY_SHORT_NAME: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function minutesSinceMidnight(value: string | null) {
  if (!value?.match(/^([01]\d|2[0-3]):[0-5]\d$/)) return null;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

export function validateBusinessHoursSchedule(hours: BusinessHoursWindow[]) {
  if (hours.length !== 7) return "Provide one schedule entry for each day of the week.";
  const weekdays = new Set(hours.map((hour) => hour.weekday));
  if (weekdays.size !== 7 || [...weekdays].some((weekday) => !Number.isInteger(weekday) || weekday < 0 || weekday > 6)) {
    return "Each weekday must appear exactly once.";
  }
  for (const hour of hours) {
    if (hour.isClosed) continue;
    const opensAt = minutesSinceMidnight(hour.opensAt);
    const closesAt = minutesSinceMidnight(hour.closesAt);
    if (opensAt === null || closesAt === null || opensAt === closesAt) {
      return "Open days need valid opening and closing times that are not identical.";
    }
  }
  return null;
}

function pakistanClock(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Karachi",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return { weekday: WEEKDAY_BY_SHORT_NAME[read("weekday")], minute: Number(read("hour")) * 60 + Number(read("minute")) };
}

/** Returns whether a Restaurant or Cloud Kitchen is currently open in Pakistan Standard Time. */
export function isBusinessOpenAt(hours: BusinessHoursWindow[], now = new Date()) {
  const { weekday, minute } = pakistanClock(now);
  if (weekday === undefined || !Number.isFinite(minute)) return false;
  const current = hours.find((hour) => hour.weekday === weekday);
  const previous = hours.find((hour) => hour.weekday === (weekday + 6) % 7);
  const isOpenDuringCurrentDay = (hour: BusinessHoursWindow | undefined) => {
    if (!hour || hour.isClosed) return false;
    const opensAt = minutesSinceMidnight(hour.opensAt);
    const closesAt = minutesSinceMidnight(hour.closesAt);
    if (opensAt === null || closesAt === null) return false;
    return closesAt > opensAt ? minute >= opensAt && minute < closesAt : minute >= opensAt;
  };
  const isOpenFromPreviousOvernightWindow = () => {
    if (!previous || previous.isClosed) return false;
    const opensAt = minutesSinceMidnight(previous.opensAt);
    const closesAt = minutesSinceMidnight(previous.closesAt);
    return opensAt !== null && closesAt !== null && closesAt < opensAt && minute < closesAt;
  };
  return isOpenDuringCurrentDay(current) || isOpenFromPreviousOvernightWindow();
}
