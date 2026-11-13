export interface PanchangHook {
  kicker: string;
  value: string;
  note: string;
  spoken: string;
}
export function buildHook(data: any): PanchangHook | null;
export function extractKeyTimings(data: any): { rahuKaal: string; yamaganda: string; abhijit: string; brahma: string };
export function dayWordFor(data: any): 'आज' | 'कल';
