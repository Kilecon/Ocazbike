import { request } from "./api-client";
import type { OpeningStatusDTO, ScheduleDTO } from "./types";

export function getSchedule(): Promise<ScheduleDTO> {
  return request<ScheduleDTO>("/opening-hours/");
}

export function getOpeningStatus(): Promise<OpeningStatusDTO> {
  return request<OpeningStatusDTO>("/opening-hours/status");
}

export function getIsOpen(): Promise<{ isOpen: boolean }> {
  return request<{ isOpen: boolean }>("/opening-hours/is-open");
}

export function saveSchedule(
  payload: {
    effectiveFrom: string;
    slots: Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      id?: string | number;
    }>;
  },
  scheduleId?: number,
): Promise<ScheduleDTO> {
  return request<ScheduleDTO>(
    scheduleId ? `/opening-hours/${scheduleId}` : "/opening-hours/",
    {
      method: scheduleId ? "PUT" : "POST",
      body: JSON.stringify({
        effectiveFrom: payload.effectiveFrom,
        slots: payload.slots.map(({ dayOfWeek, startTime, endTime }) => ({
          dayOfWeek,
          startTime,
          endTime,
        })),
      }),
    },
  );
}
