import { format } from 'date-fns';

interface CalendarEvent {
  title: string;
  description: string;
  location: string;
  startTime: Date;
  endTime: Date;
}

/**
 * Generates the content for an .ics file with a 1-hour reminder.
 */
export const generateICSContent = (event: CalendarEvent): string => {
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const now = formatDate(new Date());
  const start = formatDate(event.startTime);
  const end = formatDate(event.endTime);

  // Escape special characters in text fields
  const escapeText = (text: string): string => {
    return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  };

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//MuniNow//Inspection Scheduling//EN
BEGIN:VEVENT
UID:${now}-${start}@muninow.com
DTSTAMP:${now}
DTSTART:${start}
DTEND:${end}
SUMMARY:${escapeText(event.title)}
DESCRIPTION:${escapeText(event.description)}
LOCATION:${escapeText(event.location)}
BEGIN:VALARM
TRIGGER:-PT1H
ACTION:DISPLAY
DESCRIPTION:Reminder
END:VALARM
END:VEVENT
END:VCALENDAR`;
};

/**
 * Generates a Google Calendar URL for the event.
 * Note: Google Calendar links do not support setting specific reminders via URL parameters.
 * The user's default calendar settings will apply.
 */
export const generateGoogleCalendarUrl = (event: CalendarEvent): string => {
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const start = formatDate(event.startTime);
  const end = formatDate(event.endTime);
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    details: event.description,
    location: event.location,
    dates: `${start}/${end}`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

/**
 * Triggers a download of the .ics file.
 */
export const downloadICSFile = (filename: string, content: string): void => {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
