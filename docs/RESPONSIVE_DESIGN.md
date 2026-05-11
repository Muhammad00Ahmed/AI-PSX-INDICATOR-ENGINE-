# Responsive Design Documentation

## Overview
The PSX Market Intelligence Terminal is now fully responsive and optimized for all devices: phones, tablets, and desktops.

## Breakpoints

### Desktop (1440px+)
- **Font Size**: 14px base
- **Layout**: Full multi-column layouts
- **Grid Columns**: 4+ columns
- **Use Case**: Large monitors, trading terminals

### Large Desktop (1024px - 1439px)
- **Font Size**: 13px base
- **Layout**: Standard desktop experience
- **Grid Columns**: 3-4 columns
- **Use Case**: Desktop computers, laptops

### Tablet (768px - 1023px)
- **Font Size**: 12px base
- **Layout**: Optimized 2-column grids
- **Grid Columns**: 2-3 columns
- **Use Case**: iPad, large tablets

### Mobile (480px - 767px)
- **Font Size**: 11px base
- **Layout**: Single column, vertical stacking
- **Grid Columns**: 1-2 columns
- **Use Case**: Standard smartphones

### Small Phone (<480px)
- **Font Size**: 10px base
- **Layout**: Compact single column
- **Grid Columns**: 1 column
- **Touch-Friendly Buttons**: 44x44px minimum
- **Use Case**: Small phones, older devices

## Key Responsive Features

### Navigation & Tabs
- **Desktop**: Full horizontal tab bar with visible labels
- **Tablet**: Scrollable tab bar
- **Mobile**: Horizontal scrollable tabs with smaller fonts

### Tables
- **Desktop**: Standard data tables with multiple columns
- **Tablet**: Reduced column widths with adjusted padding
- **Mobile**: Horizontally scrollable tables with touch support

### Modals
- **Desktop**: Centered modal with max-width 900px
- **Tablet**: 95% viewport width
- **Mobile**: Full-screen modal (100vw × 100vh)

### Grids
- **Desktop**: `grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))`
- **Tablet**: `grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))`
- **Mobile**: `grid-template-columns: 1fr` (single column)

### Charts & Heatmaps
- **Desktop**: Full-size with detailed labels
- **Tablet**: Slightly reduced cell sizes
- **Mobile**: Compact cells with abbreviated labels

## Mobile Optimizations

### Touch Interactions
- Tap highlight color disabled for better UX
- Increased touch target sizes (minimum 44×44px)
- Smooth scrolling with `-webkit-overflow-scrolling: touch`
- `-webkit-font-smoothing: antialiased` for crisp text

### Safe Areas
- Supports iOS notch/Dynamic Island: `viewport-fit=cover`
- Safe area insets for notched devices
- Environment variables for safe areas: `env(safe-area-inset-*)`

### Performance
- Optimized scrollbar styling
- Efficient media queries
- Minimal reflow/repaint on resize

### Viewport Meta Tags
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=5" />
```

- `width=device-width`: Match device width
- `initial-scale=1.0`: Normal zoom level
- `viewport-fit=cover`: Extend to notches/safe areas
- `maximum-scale=5`: Allow user zoom up to 5x

### App Installation
Mobile browsers can install this as a web app:
```html
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

## Testing Checklist

### Mobile (480px - 767px)
- [ ] Header stacks vertically
- [ ] Tabs scroll horizontally
- [ ] Tables are scrollable
- [ ] Modals take full screen
- [ ] Grids are single column
- [ ] Touch targets are 44×44px minimum
- [ ] Text is readable without zoom

### Tablet (768px - 1023px)
- [ ] 2-3 column layouts
- [ ] Tabs fit with scrolling
- [ ] Charts display properly
- [ ] Modal is 95% width
- [ ] Stats cards are readable

### Desktop (1024px+)
- [ ] Full layouts display correctly
- [ ] Multiple columns visible
- [ ] All features accessible
- [ ] No horizontal scroll

## Browser Support

### Mobile Browsers
- ✅ Chrome/Edge (Android)
- ✅ Safari (iOS 12+)
- ✅ Firefox (Android)
- ✅ Samsung Internet

### Tablet Browsers
- ✅ Safari (iPad OS 12+)
- ✅ Chrome (Android 8+)
- ✅ Firefox (Android 8+)

### Desktop Browsers
- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+

## CSS Units

- **Spacing**: Relative units (px, em) that scale with font-size
- **Font Sizes**: Percentage or rem units for automatic scaling
- **Breakpoints**: CSS media queries (mobile-first approach)
- **Flexible Layouts**: Flexbox and CSS Grid with fallbacks

## Performance Metrics

- **Mobile FCP** (First Contentful Paint): < 2s
- **Mobile LCP** (Largest Contentful Paint): < 3s
- **Mobile CLS** (Cumulative Layout Shift): < 0.1
- **Mobile TTI** (Time to Interactive): < 4s

## Accessibility

### Mobile Accessibility
- Touch targets: Minimum 44×44px
- Color contrast: WCAG AA standard
- Font sizes: Readable without zoom
- Keyboard navigation: Fully supported
- Screen readers: Compatible

### Focus Management
- Visible focus indicators
- Tab order follows visual order
- Modal focus trap
- Auto-focus on critical inputs

## Future Enhancements

1. **Dark mode toggle** for mobile
2. **Gesture support** (swipe for navigation)
3. **Progressive Web App** features
4. **Offline support** with service workers
5. **Push notifications** for alerts
6. **Widget for home screen**

## Development Guidelines

### Adding Responsive Styles
1. Start with mobile-first approach
2. Use media queries for larger screens
3. Test on real devices, not just browser DevTools
4. Use `max-width` for tablet/desktop refinements
5. Keep CSS organized by breakpoint

### Example Pattern
```css
/* Mobile first */
.card { width: 100%; padding: 12px; }

/* Tablet and up */
@media (min-width: 768px) {
  .card { width: calc(50% - 6px); padding: 16px; }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .card { width: calc(25% - 12px); padding: 20px; }
}
```

## Deployment Recommendations

1. Enable GZIP compression
2. Minify CSS/JavaScript
3. Optimize images for mobile (WebP with fallbacks)
4. Use CDN for asset delivery
5. Enable caching headers
6. Test with mobile real-world connections (3G/4G)
