'use client';

import { useEffect, useState } from 'react';

export function useMediaQuery(query: string) {
  // Initialize to false for server-side rendering
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Exit early if window is not defined (SSR)
    if (typeof window === 'undefined') {
      return;
    }

    // Create media query list
    const media = window.matchMedia(query);

    // Update state on initial call
    setMatches(media.matches);

    // Define listener to update state
    const listener = () => setMatches(media.matches);

    // Add change listener
    media.addEventListener('change', listener);

    // Clean up
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}
