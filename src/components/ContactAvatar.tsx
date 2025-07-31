'use client';

import { useMemo, useState, useEffect } from 'react';
import { minidenticon } from 'minidenticons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

// Detect iOS Safari for compatibility adjustments
const isIOSSafari = () => {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const webkit = /WebKit/.test(ua);
  const chrome = /CriOS|Chrome/.test(ua);
  return iOS && webkit && !chrome;
};

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
  const [imageError, setImageError] = useState(false);
  const [canvasDataUrl, setCanvasDataUrl] = useState<string | null>(null);
  const isIOS = useMemo(() => isIOSSafari(), []);

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
  };

  const sizePx = {
    sm: 32,
    md: 40,
    lg: 64,
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
    try {
      return minidenticon(address, 90, 50); // saturation and lightness
    } catch (error) {
      console.warn('Failed to generate minidenticon:', error);
      return null;
    }
  }, [address]);

  // Convert SVG string to data URL for better iOS compatibility
  const svgDataUrl = useMemo(() => {
    if (!identiconSvg || imageError || isIOS) return null;
    try {
      const encodedSvg = encodeURIComponent(identiconSvg);
      return `data:image/svg+xml,${encodedSvg}`;
    } catch (error) {
      console.warn('Failed to encode SVG:', error);
      return null;
    }
  }, [identiconSvg, imageError, isIOS]);

  // Generate canvas-based avatar as primary approach for iOS
  useEffect(() => {
    if (!identiconSvg || canvasDataUrl || (!isIOS && !imageError)) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dimension = sizePx[size];
    canvas.width = dimension;
    canvas.height = dimension;

    try {
      // Create an image from the SVG
      const img = new Image();
      img.onload = () => {
        try {
          ctx.drawImage(img, 0, 0, dimension, dimension);
          const dataUrl = canvas.toDataURL('image/png');
          setCanvasDataUrl(dataUrl);
        } catch (canvasError) {
          console.warn('Canvas toDataURL failed:', canvasError);
        }
      };
      img.onerror = () => {
        console.warn('Failed to load SVG into canvas');
      };

      const encodedSvg = encodeURIComponent(identiconSvg);
      img.src = `data:image/svg+xml,${encodedSvg}`;
    } catch (error) {
      console.warn('Canvas avatar generation failed:', error);
    }
  }, [identiconSvg, size, canvasDataUrl, isIOS, imageError, sizePx]);

  // Extract dominant color and determine contrasting background
  const backgroundColorClass = useMemo(() => {
    if (!identiconSvg) return 'bg-white dark:bg-gray-800';

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
      {!isIOS && svgDataUrl && !imageError ? (
        <img
          src={svgDataUrl}
          alt={`${name} avatar`}
          className="w-full h-full object-cover rounded-full"
          style={{
            imageRendering: 'crisp-edges',
          }}
          onError={() => {
            setImageError(true);
          }}
          onLoad={() => {
            setImageError(false);
          }}
        />
      ) : canvasDataUrl ? (
        <img
          src={canvasDataUrl}
          alt={`${name} avatar`}
          className="w-full h-full object-cover rounded-full"
          style={{
            imageRendering: 'crisp-edges',
          }}
        />
      ) : (
        <AvatarFallback className="bg-avian-100 text-avian-800 dark:bg-avian-900 dark:text-avian-200">
          {fallbackInitials}
        </AvatarFallback>
      )}
    </Avatar>
  );
}
