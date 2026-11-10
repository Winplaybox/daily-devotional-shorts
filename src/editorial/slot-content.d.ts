export interface AfternoonSlotHighlight {
  label: string;
  value: string;
}

export interface AfternoonSlotContent {
  title: string;
  highlights: AfternoonSlotHighlight[];
  footer: string;
}

export function getAfternoonSlotContent(data: any): AfternoonSlotContent | null;
export function buildAfternoonNarration(data: any, dateGreeting?: string): string;
