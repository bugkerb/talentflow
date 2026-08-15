import { randomUUID } from "node:crypto";
export const requestIdFrom = (value?: string | null): string => value?.trim() || randomUUID();
