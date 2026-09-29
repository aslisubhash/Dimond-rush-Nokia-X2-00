/** Global simulation constants. All gameplay code works in logical pixels. */
export const TILE = 32;
export const VIEW_W = 1280;
export const VIEW_H = 720;
/** Fixed simulation rate. Physics never depends on render frame rate. */
export const SIM_HZ = 120;
export const SIM_DT = 1 / SIM_HZ;
/** Upper bound of simulation steps per rendered frame (spiral-of-death guard). */
export const MAX_STEPS_PER_FRAME = 12;
