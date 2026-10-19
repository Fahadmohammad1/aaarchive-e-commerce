const dateTime = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Dhaka",
});
const date = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Dhaka",
});

/** "19 Oct, 20:25" in Dhaka time. */
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));
/** "19 Oct 2026". */
export const formatDate = (iso: string) => date.format(new Date(iso));
