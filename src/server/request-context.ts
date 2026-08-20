import { randomUUID } from "node:crypto";
const requestIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
export const requestIdFrom = (value?: string | null): string => {
  const candidate = value?.trim();
  return candidate && requestIdPattern.test(candidate) ? candidate : randomUUID();
};
