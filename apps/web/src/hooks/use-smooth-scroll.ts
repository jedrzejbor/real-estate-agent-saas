/**
 * Hook returning a `scrollTo` function that smoothly navigates to a section
 * by its hash (e.g. "#features"), accounting for the sticky navbar height.
 *
 * Usage:
 *   const { scrollTo } = useSmoothScroll();
 *   scrollTo('#features');
 */
export function useSmoothScroll(defaultOffset = 80) {
  const scrollTo = (href: string, offset = defaultOffset) => {
    if (!href.startsWith('#')) return;

    const id = href.slice(1);
    const element = document.getElementById(id);
    if (!element) return;

    const top =
      element.getBoundingClientRect().top + window.scrollY - offset;

    window.scrollTo({ top, behavior: 'smooth' });
  };

  return { scrollTo };
}
