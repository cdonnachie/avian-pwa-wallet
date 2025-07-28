'use client';

import { useMemo } from 'react';
import { minidenticon } from 'minidenticons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface ContactAvatarProps {
  name: string;
  address: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function ContactAvatar({
  name,
  address,
  size = 'md',
  className = '',
}: ContactAvatarProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
  };

  const fallbackInitials = useMemo(() => {
    return name
      .split(' ')
      .map((word) => word.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [name]);

  // Generate minidenticon SVG
  const identiconSvg = useMemo(() => {
    return minidenticon(address, 90, 50); // saturation and lightness
  }, [address]);

  // Extract dominant color and determine contrasting background
  const backgroundColorClass = useMemo(() => {
    try {
      // Parse the SVG to extract fill colors
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(identiconSvg, 'image/svg+xml');
      const rects = svgDoc.querySelectorAll('rect[fill]');

      if (rects.length === 0) return 'bg-white dark:bg-gray-800';

      // Get all non-background colors
      const colors: string[] = [];
      rects.forEach((rect) => {
        const fill = rect.getAttribute('fill');
        if (
          fill &&
          fill !== '#f0f0f0' &&
          fill !== '#ffffff' &&
          fill !== 'transparent' &&
          !fill.includes('none')
        ) {
          colors.push(fill);
        }
      });

      if (colors.length === 0) return 'bg-white dark:bg-gray-800';

      // Get the most common color or the first valid color
      const dominantColor = colors[0];

      // Validate hex color format
      if (!/^#[0-9A-F]{6}$/i.test(dominantColor)) {
        return 'bg-white dark:bg-gray-800';
      }

      // Convert hex to RGB
      const hex = dominantColor.replace('#', '');
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);

      // Calculate relative luminance using WCAG formula
      const srgb = [r, g, b].map((c) => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      const luminance = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];

      // Simple but effective contrast logic
      if (luminance < 0.4) {
        // Dark colors get bright white background
        return 'bg-white dark:bg-gray-100';
      } else if (luminance > 0.6) {
        // Light colors get dark background
        return 'bg-gray-800 dark:bg-gray-900';
      } else {
        // Medium colors - check if it's more blue, red, or green
        if (b > r && b > g) {
          // Blue dominant - use light background
          return 'bg-gray-100 dark:bg-gray-200';
        } else if (r > g && r > b) {
          // Red dominant - use light background
          return 'bg-gray-100 dark:bg-gray-200';
        } else {
          // Green or mixed - use medium background
          return 'bg-gray-200 dark:bg-gray-300';
        }
      }
    } catch (error) {
      // Fallback in case of any parsing errors
      return 'bg-white dark:bg-gray-800';
    }
  }, [identiconSvg]);

  return (
    <Avatar className={cn(sizeClasses[size], backgroundColorClass, className)}>
      {identiconSvg ? (
        <div
          className="w-full h-full flex items-center justify-center"
          dangerouslySetInnerHTML={{ __html: identiconSvg }}
        />
      ) : (
        <AvatarFallback className="bg-avian-100 text-avian-800 dark:bg-avian-900 dark:text-avian-200">
          {fallbackInitials}
        </AvatarFallback>
      )}
    </Avatar>
  );
}
