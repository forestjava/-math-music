/** Длительность сессии в минутах TODO вынести в UI */
export const DURATION_MINUTES = 1;

export const DURATION_SECONDS = DURATION_MINUTES * 60;

/** Сессия делится на 40 примерно равных отрезка. */
export const SEGMENT_COUNT = 40;

export const SEGMENT_DURATION = DURATION_SECONDS / SEGMENT_COUNT;
