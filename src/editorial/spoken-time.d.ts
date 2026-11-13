export function dayPart(hour24: number): string;
export function parseTimes(value: string): { hour24: number; minute: string }[];
export function spokenTime(value: string): string;
export function spokenRange(value: string, options?: { suffix?: string }): string;
export function displayRange(value: string): string;
