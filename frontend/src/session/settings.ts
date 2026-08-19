export interface SessionSettings {
  loop: boolean;
  userInput: string;
}

export const DEFAULT_USER_INPUT = "Создай новый сценарий этой сессии";

export const DEFAULT_SESSION_SETTINGS: SessionSettings = {
  loop: false,
  userInput: DEFAULT_USER_INPUT,
};

/** Длительность для офлайн-проверок стыков интервалов. */
export const CHECK_DURATION_SECONDS = 1200;
