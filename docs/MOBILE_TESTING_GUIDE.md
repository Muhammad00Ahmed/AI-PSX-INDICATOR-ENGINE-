# Mobile Responsive Testing Guide

## Quick Start Testing

### Using Chrome DevTools
1. Open DevTools (F12 / Cmd+Option+I)
2. Click "Toggle device toolbar" (Ctrl+Shift+M)
3. Select device presets:
   - **iPhone 12**: 390px × 844px
   - **iPad Pro**: 1024px × 1366px
   - **Desktop**: 1440px+

### Using Browser DevTools
- Test all breakpoints: 375px, 480px, 768px, 1024px, 1440px
- Test in portrait and landscape modes
- Test with throttled network (Slow 4G, Fast 3G)

## Device-Specific Testing

### Small Phones (<480px)
- **Devices**: iPhone SE, Samsung Galaxy A12
- **Focus Areas**:
  - Text readability without zoom
  - Touch targets are at least 44×44px
  - No horizontal scroll
  - Modal takes full screen

**Test Checklist**:
- [ ] Header displays properly
- [ ] Tabs scroll horizontally
- [ ] Index cards fit without overflow
- [ ] Market table scrolls horizontally
- [ ] Modal opens full-screen
- [ ] Close button is tappable
- [ ] All buttons have minimum 44×44px hit area

### Standard Phones (480px - 767px)
- **Devices**: iPhone 12, Samsung Galaxy S20
- **Focus Areas**:
  - Single column layouts
  - Touch-friendly spacing
  - Modal is full-width
  - Grids with 1-2 columns

**Test Checklist**:
- [ ] Tabs are scrollable
- [ ] Grids are 1 column
- [ ] Forms stack vertically
- [ ] Modal padding is adequate
- [ ] Chart is readable
- [ ] Buttons have proper size

### Tablets (768px - 1023px)
- **Devices**: iPad, Samsung Galaxy Tab S6
- **Focus Areas**:
  - 2-3 column layouts
  - Balanced spacing
  - Modal at 95% width
  - Touch targets 44×44px

**Test Checklist**:
- [ ] Grids show 2-3 columns
- [ ] Header fits with indices
- [ ] Tabs and buttons fit
- [ ] Modal is readable
- [ ] Charts display properly
- [ ] No excessive padding

### Large Tablets/Desktops (1024px+)
- **Devices**: iPad Pro, Desktop monitors
- **Focus Areas**:
  - Full multi-column layouts
  - All features visible
  - Optimal spacing

## Orientation Testing

### Portrait Mode
- **Mobile**: 375px × 812px
- **Tablet**: 768px × 1024px
- **Desktop**: Not applicable

**Test**:
- All content fits without horizontal scroll
- Text is readable
- Buttons are easily tappable

### Landscape Mode
- **Mobile**: 812px × 375px
- **Tablet**: 1024px × 768px

**Test**:
- Layout adapts to wider aspect ratio
- Horizontal scrolling if needed
- No content cut off

## Performance Testing

### Mobile Network Throttling
1. DevTools → Network tab
2. Select "Slow 4G" or "Fast 3G"
3. Load the application

**Expectations**:
- First load: < 5 seconds
- Tab switching: < 1 second
- Modal open: < 500ms
- Chart update: < 2 seconds

### Lighthouse Audit
1. Open DevTools
2. Go to Lighthouse tab
3. Run audit for Mobile

**Target Scores**:
- Performance: > 80
- Accessibility: > 95
- Best Practices: > 90

## Touch Interaction Testing

### Tap Targets
- Verify all buttons/links are at least 44×44px
- Test double-tap zoom disabled
- Test tap feedback (no highlight lag)

### Scrolling
- Test smooth scrolling in lists
- Test momentum scrolling (iOS)
- Verify no scroll bounce issues

### Gestures
- Test horizontal scroll (tabs, range chips)
- Test vertical scroll (lists)
- Test pinch zoom disabled

## Accessibility Testing

### Screen Reader Testing
**Mobile Screen Readers**:
- iOS: VoiceOver (Settings > Accessibility)
- Android: TalkBack (Settings > Accessibility)

**Test**:
- All interactive elements are announced
- Focus order is logical
- Modal closes on screen reader
- Charts have alt text

### Keyboard Navigation
- Tab through all controls
- Shift+Tab for reverse navigation
- Enter to activate buttons
- Escape to close modals

### Color Contrast
- Text contrast: 4.5:1 for body text
- Large text contrast: 3:1
- Use WebAIM Contrast Checker

## Responsive Image Testing

### Image Formats
- JPG for photos
- PNG for graphics
- WebP with fallbacks

### Image Sizes
- Mobile (up to 480px): max 1x resolution
- Tablet (480px - 1024px): 1.5x resolution
- Desktop (1024px+): 2x resolution

### Srcset Testing
Verify images load correctly across devices

## Safe Area Testing

### iOS Notch/Dynamic Island
- Devices: iPhone 12, 14, 15+
- Test in portrait and landscape
- Verify content doesn't hide under notch

### Android Status Bar
- Test on Android 9+
- Verify title bar doesn't overlap
- Check safe area insets

## Testing Checklist by Device

### Small Phone (375px)
```
- [ ] Header stacks vertically
- [ ] Logo visible and readable
- [ ] Index cards fit and are readable
- [ ] Tabs scroll horizontally
- [ ] Search input full width
- [ ] Table scrolls horizontally
- [ ] Modal takes full screen
- [ ] All buttons are tappable (44×44px)
- [ ] No horizontal scroll on main content
- [ ] Text is readable (14px+ minimum)
- [ ] Touch feedback is smooth
- [ ] Forms stack vertically
- [ ] No content overflow
- [ ] Modal close button is accessible
```

### Standard Phone (480px)
```
- [ ] Same as small phone, plus:
- [ ] Grids are mostly single column
- [ ] Index cards have good spacing
- [ ] Modal has adequate padding
- [ ] Chart is readable at 80% width
- [ ] All text is accessible
- [ ] Buttons have proper hit targets
```

### Tablet (768px)
```
- [ ] Header has indices visible
- [ ] Tabs fit better with scrolling
- [ ] Grids show 2 columns
- [ ] Modal is at 95% width
- [ ] Chart is properly sized
- [ ] Forms have good spacing
- [ ] All elements fit comfortably
```

### Desktop (1024px+)
```
- [ ] Full multi-column layouts
- [ ] All features accessible
- [ ] Optimal spacing throughout
- [ ] No responsive issues
- [ ] Charts at full resolution
- [ ] All content visible without scroll
```

## Network Testing

### Throttled Connections
1. DevTools → Network → Throttle Presets
2. Test on "Slow 4G"

**Expected Performance**:
- HTML loaded: < 2s
- CSS loaded: < 3s
- JS loaded: < 4s
- First interactive: < 5s

### Offline Testing
1. DevTools → Network → Offline
2. Verify graceful degradation
3. Check error messages

## Browser Compatibility

### iOS Safari
- [ ] iOS 14+
- [ ] Test notch handling
- [ ] Test safe areas
- [ ] Test keyboard
- [ ] Test scrolling

### Chrome Android
- [ ] Android 8+
- [ ] Test swipe navigation
- [ ] Test zoom behavior
- [ ] Test status bar

### Firefox Mobile
- [ ] Android 8+
- [ ] Test UI rendering
- [ ] Test performance
- [ ] Test accessibility

## Bug Reporting Template

When you find an issue, document it:

```
Device: [iPhone 12 / iPad / Desktop]
OS: [iOS 15 / Android 12 / Windows 11]
Browser: [Safari / Chrome / Firefox]
Viewport: [390px × 844px]
Issue: [Description]
Steps to Reproduce:
1. [Step 1]
2. [Step 2]
Expected: [Expected behavior]
Actual: [Actual behavior]
Screenshots: [Attach]
```

## Continuous Testing

### Automated Testing
- Use BrowserStack for cross-device testing
- Use Lighthouse CI for performance tracking
- Use Percy for visual regression testing

### Real Device Testing
- Test on at least 3 real devices per breakpoint
- Test on 3G/4G networks
- Test with real user profiles

## Performance Optimization

### Mobile-Specific Optimizations
- [ ] Images optimized (WebP with fallback)
- [ ] CSS minified and critical path optimized
- [ ] JavaScript bundled and minified
- [ ] Lazy loading for below-fold images
- [ ] Service worker for offline support
- [ ] Compression enabled on server

### Testing Tools
- PageSpeed Insights
- GTmetrix
- WebPageTest
- Lighthouse
- BrowserStack

## Deployment Checklist

Before going live on mobile:
- [ ] Tested on iOS 12+
- [ ] Tested on Android 8+
- [ ] Tested on all breakpoints
- [ ] Touch targets are 44×44px
- [ ] No console errors
- [ ] Lighthouse score > 85
- [ ] Network throttle tested
- [ ] Safe areas handled
- [ ] Accessibility > 95
- [ ] Performance > 80
