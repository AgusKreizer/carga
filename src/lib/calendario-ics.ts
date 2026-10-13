/**
 * Recordatorios sin servidor: un .ics con eventos semanales recurrentes que el usuario importa
 * en Google Calendar o iOS. El calendario es el que avisa.
 */
const DIAS_ICS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']

export function generarICS(dias: number[], hora: string, minutos: number, nombre = 'Entrenar · Carga'): string {
  const [h, m] = hora.split(':').map(Number)
  const ahora = new Date()
  // primer lunes desde hoy
  const inicio = new Date(ahora)
  inicio.setDate(inicio.getDate() + ((1 - inicio.getDay() + 7) % 7))
  const pad = (n: number) => String(n).padStart(2, '0')
  const fecha = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
  const dtStart = `${fecha(inicio)}T${pad(h)}${pad(m)}00`
  const fin = new Date(inicio)
  fin.setMinutes(fin.getMinutes() + h * 60 + m + minutos)
  const dtEnd = `${fecha(inicio)}T${pad(fin.getHours())}${pad(fin.getMinutes())}00`
  const stamp = ahora.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
  const byday = dias.map((d) => DIAS_ICS[d]).join(',')
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Carga//ES', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:carga-entrenar-${stamp}@carga`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `RRULE:FREQ=WEEKLY;BYDAY=${byday}`,
    `SUMMARY:${nombre}`,
    'DESCRIPTION:Abrí Carga: ya sabe qué día toca.',
    'BEGIN:VALARM', 'TRIGGER:-PT60M', 'ACTION:DISPLAY', 'DESCRIPTION:Entrenar en una hora', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
}
