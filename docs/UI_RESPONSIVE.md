# Responsive Design System

This document describes the responsive design architecture implemented across the Avian FlightDeck Wallet application.

## Overview

The Avian FlightDeck Wallet uses a mobile-first responsive design system that provides optimal user experiences across all device types. The system is built around a consistent breakpoint and component pattern that ensures seamless adaptation between mobile and desktop interfaces.

## Design Principles

### Mobile-First Architecture

- All components are designed for mobile interfaces first
- Desktop layouts are progressively enhanced versions of mobile designs
- Touch-optimized interactions on mobile devices
- Responsive typography and spacing

### Consistent Breakpoint System

- **Primary Breakpoint**: 640px (using `useMediaQuery("(max-width: 640px)")`)
- Below 640px: Mobile interface (drawers, full-screen modals)
- Above 640px: Desktop interface (dialogs, centered modals)

## Component Patterns

### Drawer/Dialog Pattern

The core responsive pattern used throughout the application:

```tsx
const isMobile = useMediaQuery('(max-width: 640px)');

return isMobile ? (
  <Drawer open={isOpen} onOpenChange={onClose}>
    <DrawerContent>{/* Mobile-optimized full-screen interface */}</DrawerContent>
  </Drawer>
) : (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent>{/* Desktop-optimized centered modal */}</DialogContent>
  </Dialog>
);
```

### Components Using Responsive Pattern

#### 1. AuthenticationDialog

- **Mobile**: Full-screen drawer with large touch targets
- **Desktop**: Centered dialog with traditional form layout
- **Features**: Biometric authentication, password input, error handling

#### 2. BackupQRModal

- **Mobile**: Full-screen QR code display with optimized sizing
- **Desktop**: Centered modal with standard QR code size
- **Features**: QR code generation, backup type selection, camera scanning

#### 3. BackupDrawer

- **Mobile**: Full-screen sheet with tabbed interface
- **Desktop**: Large dialog with side-by-side tab layout
- **Features**: Backup creation, restore functionality, encryption options

#### 4. DerivedAddressesPanel

- **Mobile**: Optimized tabs with compressed layouts and mobile-friendly search
- **Desktop**: Full-featured interface with detailed address information
- **Features**: Address management, search functionality, balance display

#### 5. WalletSettingsDashboard

- **Mobile**: Multiple drawer interfaces for different settings sections
- **Desktop**: Modal dialogs for settings management
- **Features**: Wallet encryption, private key export, security settings

#### 6. LogViewer

- **Mobile**: Responsive dialog with touch-friendly controls
- **Desktop**: Large dialog with detailed log information
- **Features**: Debug status indicators, security audit integration, log filtering

#### 7. MnemonicModal

- **Mobile**: Full-screen drawer for mnemonic phrase display/input
- **Desktop**: Centered dialog with security warnings
- **Features**: Mnemonic generation, import/export, security alerts

## Implementation Details

### useMediaQuery Hook

The responsive system relies on the `useMediaQuery` hook:

```tsx
import { useMediaQuery } from '@/hooks/use-media-query';

const isMobile = useMediaQuery('(max-width: 640px)');
```

### Shared Content Pattern

Many components use shared content components that work in both mobile and desktop contexts:

```tsx
// Shared content component
function SharedContent({ isDrawer = false }: { isDrawer?: boolean }) {
  return (
    <div className={`space-y-4 ${isDrawer ? 'p-4' : 'p-6'}`}>
      {/* Content that works in both contexts */}
    </div>
  );
}

// Usage in both contexts
{
  isMobile ? (
    <DrawerContent>
      <SharedContent isDrawer={true} />
    </DrawerContent>
  ) : (
    <DialogContent>
      <SharedContent isDrawer={false} />
    </DialogContent>
  );
}
```

### Mobile Optimizations

#### Touch Targets

- Minimum 44px touch targets on mobile
- Increased padding and margins for touch interaction
- Full-width buttons where appropriate

#### Typography

- Responsive text sizing
- Compressed layouts for smaller screens
- Icon sizing adjustments for mobile

#### Navigation

- Tab interfaces optimized for touch
- Gesture-friendly drawer interactions
- Simplified navigation patterns

## Styling Conventions

### Responsive Classes

- `sm:` prefix for desktop-specific styles (640px and up)
- Mobile-first approach: base classes apply to mobile
- Conditional className logic for component-specific responsive behavior

### Layout Patterns

```tsx
// Container responsive pattern
<div className="flex flex-col sm:flex-row gap-2 justify-between">
  {/* Mobile: stacked vertically, Desktop: horizontal layout */}
</div>

// Button responsive pattern
<Button className={isMobile ? 'w-full' : 'w-auto'}>
  {/* Full width on mobile, auto width on desktop */}
</Button>
```

## Benefits

### User Experience

- Optimal interface for each device type
- Consistent interaction patterns
- Fast, touch-friendly mobile experience
- Comprehensive desktop functionality

### Developer Experience

- Consistent responsive patterns across components
- Reusable responsive logic
- Clear separation of mobile and desktop concerns
- Easy to maintain and extend

### Performance

- Efficient rendering with conditional component mounting
- Optimized bundle splitting for mobile/desktop features
- Minimal layout shifts during responsive transitions

## Testing Responsive Design

### Manual Testing

1. Test at 640px breakpoint boundary
2. Verify touch interactions on mobile devices
3. Ensure proper drawer/dialog behavior
4. Check content overflow and scrolling

### Responsive Testing Tools

- Browser DevTools device simulation
- Physical device testing
- Responsive design mode in browsers

## Future Considerations

### Potential Enhancements

- Additional breakpoints for tablet-specific layouts
- Enhanced touch gesture support
- Progressive enhancement for larger screens
- Advanced responsive typography scaling

### Maintenance

- Regular testing across device types
- Updates to responsive patterns as needed
- Performance monitoring for responsive components
- User feedback integration for mobile experience improvements
