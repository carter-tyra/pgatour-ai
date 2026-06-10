import type { Transition, Variants } from "framer-motion";

/**
 * Shared motion language for the intelligence terminal.
 *
 * Principles (emil-design-eng / userinterface-wiki):
 * - UI motion stays under 300ms and uses strong custom ease-out curves.
 * - Enter with ease-out + translate/scale; nothing appears from scale(0).
 * - Stagger is decorative and short (≤ 60ms/item); never blocks interaction.
 * - Springs only where motion should feel physical (bars, counters, drags).
 * - All consumers must honor prefers-reduced-motion (see `reduceVariants`).
 */

// Strong curves — the built-in CSS easings are too weak.
export const easeOutStrong = [0.23, 1, 0.32, 1] as const;
export const easeOutQuart = [0.25, 1, 0.5, 1] as const;
export const easeInOutStrong = [0.77, 0, 0.175, 1] as const;

export const springSoft: Transition = { type: "spring", stiffness: 260, damping: 32, mass: 0.9 };
export const springBar: Transition = { type: "spring", stiffness: 180, damping: 26, mass: 1 };
export const springSnappy: Transition = { type: "spring", stiffness: 420, damping: 34, mass: 0.8 };

/** Container that staggers its children's entrance. */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.045, delayChildren: 0.04 },
  },
};

/** A panel / card rising into place. Pairs with `staggerContainer`. */
export const riseItem: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.42, ease: easeOutQuart },
  },
};

/** A list row sliding in — subtler than a panel. */
export const rowItem: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.34, ease: easeOutQuart } },
};

/** Reduced-motion equivalents: opacity only, no transform. */
export const reduceContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.02 } },
};
export const reduceItem: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
};

/** whileTap for pressable surfaces — subtle, never below 0.95. */
export const pressTap = { scale: 0.97 } as const;
export const pressTapSubtle = { scale: 0.985 } as const;

/** Pick the right variant set for the user's motion preference. */
export function motionSet(reduce: boolean) {
  return reduce
    ? { container: reduceContainer, item: reduceItem, row: reduceItem }
    : { container: staggerContainer, item: riseItem, row: rowItem };
}
