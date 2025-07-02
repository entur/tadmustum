import { useEffect } from 'react';

/**
 * A hook that locks the body's scroll, preventing it while the component is mounted.
 */
export function useBodyOverflowLock() {
  useEffect(() => {
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Cleanup function to restore the original style
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []); // Empty dependency array ensures this runs only on mount and unmount
}
