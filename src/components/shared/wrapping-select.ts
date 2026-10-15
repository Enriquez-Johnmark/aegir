/**
 * Classes for a SelectTrigger whose value wraps instead of being clipped when
 * text is enlarged (WCAG 1.4.4). Plain min-h-8 (not a data-attribute variant), so
 * the trigger's own pointer-coarse:min-h-11 still wins on touch.
 */
export const WRAPPING_SELECT_TRIGGER =
  "min-h-8 py-1 text-left whitespace-normal data-[size=default]:h-auto *:data-[slot=select-value]:line-clamp-none";
