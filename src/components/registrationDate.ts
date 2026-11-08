export function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromIsoDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

export function formatDateForField(value: string) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${day} / ${month} / ${year}`;
}

export function latestAdultDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 18);
  return date;
}
