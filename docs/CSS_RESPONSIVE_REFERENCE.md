# Responsive CSS Reference Guide

## Quick Media Query Reference

### All Breakpoints
```css
/* Small Phone: < 480px */
@media (max-width: 479px) { }

/* Standard Phone: 480px - 767px */
@media (max-width: 767px) { }

/* Tablet: 768px - 1023px */
@media (max-width: 1023px) { }

/* Large Desktop: 1024px - 1439px */
@media (max-width: 1439px) and (min-width: 1024px) { }

/* Extra Large: 1440px+ */
@media (min-width: 1440px) { }
```

## Common Patterns

### Typography Scaling
```css
/* Desktop */
html { font-size: 13px; }

/* Tablet */
@media (max-width: 1023px) {
  html { font-size: 12px; }
}

/* Mobile */
@media (max-width: 767px) {
  html { font-size: 11px; }
}

/* Small Phone */
@media (max-width: 479px) {
  html { font-size: 10px; }
}
```

### Responsive Grid
```css
/* 4 columns desktop */
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

/* 3 columns tablet */
@media (max-width: 1023px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
}

/* 2 columns mobile */
@media (max-width: 767px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
}

/* 1 column small phone */
@media (max-width: 479px) {
  .grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }
}
```

### Responsive Flex Layout
```css
/* Row layout desktop */
.flex-container {
  display: flex;
  flex-direction: row;
  gap: 16px;
}

/* Column layout mobile */
@media (max-width: 767px) {
  .flex-container {
    flex-direction: column;
    gap: 12px;
  }
}
```

### Responsive Padding/Margin
```css
/* Desktop */
.card {
  padding: 20px;
  margin-bottom: 16px;
}

/* Tablet */
@media (max-width: 1023px) {
  .card {
    padding: 16px;
    margin-bottom: 12px;
  }
}

/* Mobile */
@media (max-width: 767px) {
  .card {
    padding: 12px;
    margin-bottom: 10px;
  }
}

/* Small Phone */
@media (max-width: 479px) {
  .card {
    padding: 8px;
    margin-bottom: 8px;
  }
}
```

### Responsive Font Sizes
```css
/* Desktop */
.heading { font-size: 28px; }
.body { font-size: 13px; }

/* Tablet */
@media (max-width: 1023px) {
  .heading { font-size: 24px; }
  .body { font-size: 12px; }
}

/* Mobile */
@media (max-width: 767px) {
  .heading { font-size: 20px; }
  .body { font-size: 11px; }
}

/* Small Phone */
@media (max-width: 479px) {
  .heading { font-size: 16px; }
  .body { font-size: 10px; }
}
```

### Hide/Show Elements
```css
/* Hide on tablet and below */
.desktop-only { display: block; }
@media (max-width: 1023px) {
  .desktop-only { display: none; }
}

/* Show only on mobile */
.mobile-only { display: none; }
@media (max-width: 767px) {
  .mobile-only { display: block; }
}

/* Show only on tablet */
.tablet-only { display: none; }
@media (max-width: 1023px) and (min-width: 768px) {
  .tablet-only { display: block; }
}
```

## Component-Specific Patterns

### Modal Dialog
```css
/* Desktop: Centered modal */
.modal {
  max-width: 600px;
  margin: 0 auto;
  padding: 24px;
}

/* Tablet: Larger modal */
@media (max-width: 1023px) {
  .modal {
    max-width: 95vw;
    padding: 20px;
  }
}

/* Mobile: Full-screen modal */
@media (max-width: 767px) {
  .modal {
    width: 100vw;
    max-width: 100vw;
    height: 100vh;
    padding: 0;
    border-radius: 0;
  }
}
```

### Navigation Bar
```css
/* Desktop: Horizontal nav */
.navbar {
  display: flex;
  flex-direction: row;
  gap: 24px;
  padding: 16px;
}

/* Tablet: Smaller nav */
@media (max-width: 1023px) {
  .navbar {
    gap: 12px;
    padding: 12px;
  }
}

/* Mobile: Scrollable nav */
@media (max-width: 767px) {
  .navbar {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    gap: 8px;
    padding: 10px;
  }
}
```

### Table Layout
```css
/* Desktop: Standard table */
.table {
  font-size: 13px;
  width: 100%;
}

.table td { padding: 10px; }

/* Tablet: Reduced size */
@media (max-width: 1023px) {
  .table { font-size: 12px; }
  .table td { padding: 8px; }
}

/* Mobile: Horizontal scroll */
@media (max-width: 767px) {
  .table-wrapper {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .table { font-size: 11px; }
  .table td { padding: 6px; }
  
  /* Hide less important columns */
  .table .column-desktop { display: none; }
}
```

### Card Grid
```css
/* Desktop: 4 cards */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

/* Tablet: 2-3 cards */
@media (max-width: 1023px) {
  .card-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
  }
}

/* Mobile: 1 card */
@media (max-width: 767px) {
  .card-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}
```

### Form Layout
```css
/* Desktop: Multiple columns */
.form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* Tablet: Single column with wider inputs */
@media (max-width: 1023px) {
  .form {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .form-input {
    font-size: 14px; /* Prevents zoom on iOS */
  }
}

/* Mobile: Single column, stacked */
@media (max-width: 767px) {
  .form {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  
  .form-input {
    padding: 12px;
    font-size: 16px; /* Prevents zoom on iOS */
  }
}
```

## Advanced Patterns

### Responsive Images
```css
/* Desktop */
.image {
  width: 100%;
  max-width: 600px;
}

/* Tablet */
@media (max-width: 1023px) {
  .image {
    max-width: 400px;
  }
}

/* Mobile */
@media (max-width: 767px) {
  .image {
    max-width: 100%;
  }
}
```

### Orientation-Specific Styles
```css
/* Landscape mode */
@media (orientation: landscape) {
  .header { height: 44px; }
  .sidebar { width: 200px; }
}

/* Portrait mode */
@media (orientation: portrait) {
  .header { height: 56px; }
  .sidebar { width: 100%; }
}

/* Mobile landscape */
@media (max-width: 767px) and (orientation: landscape) {
  .main-content { flex-direction: row; }
  .sidebar { width: 150px; }
}
```

### Safe Area Support
```css
/* Default padding */
.container {
  padding: 20px;
}

/* Add safe area for notched devices */
@media (max-width: 767px) {
  .container {
    padding-top: calc(20px + env(safe-area-inset-top));
    padding-bottom: calc(20px + env(safe-area-inset-bottom));
    padding-left: calc(20px + env(safe-area-inset-left));
    padding-right: calc(20px + env(safe-area-inset-right));
  }
}
```

### Reduced Motion
```css
/* Regular animation */
.button {
  transition: background 0.3s ease;
}

/* Respect user preference */
@media (prefers-reduced-motion: reduce) {
  .button {
    transition: background 0.01ms ease;
  }
}
```

### Dark Mode
```css
/* Light mode default */
.card {
  background: white;
  color: black;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .card {
    background: #1a1a1a;
    color: #f0f0f0;
  }
}
```

## Performance Tips

### Minimize Reflow
```css
/* ❌ Bad: Causes multiple reflows */
.container { width: 100%; }
.item { width: 50%; }
@media (max-width: 767px) {
  .container { width: 95%; }  /* Reflow */
  .item { width: 100%; }      /* Reflow */
}

/* ✅ Good: Single media query */
@media (max-width: 767px) {
  .container { width: 95%; }
  .item { width: 100%; }
}
```

### Use Efficient Selectors
```css
/* ❌ Bad: Inefficient selector */
.page > .section > .container > .item > .text { }

/* ✅ Good: Direct class */
.card-text { }
```

### Minimize Media Queries
```css
/* ❌ Bad: Multiple queries */
@media (max-width: 767px) { }
@media (max-width: 767px) { }
@media (max-width: 767px) { }

/* ✅ Good: Combine queries */
@media (max-width: 767px) {
  /* All mobile styles */
}
```

## Testing Breakpoints in DevTools

### Chrome/Edge DevTools
1. F12 → Device Toolbar (Ctrl+Shift+M)
2. Select device or custom size
3. Test your breakpoints

### Firefox DevTools
1. Ctrl+Shift+M (Windows/Linux) or Cmd+Option+M (Mac)
2. Select responsive mode
3. Adjust viewport size

### Safari DevTools
1. Develop → Enter Responsive Design Mode
2. Select device or custom size
3. Test layouts

## Debugging Media Queries

### Check Applied Styles
1. Open DevTools
2. Right-click element
3. Select "Inspect"
4. Check "Computed" tab for active media query

### Verify Breakpoint
1. Open DevTools
2. Check top-right "Responsive" indicator
3. See current viewport size
4. Compare with breakpoint values

### Use CSS Debugging
```css
/* Temporary debug styling */
@media (max-width: 767px) {
  body::after {
    content: "MOBILE";
    position: fixed;
    bottom: 0;
    right: 0;
    background: red;
    color: white;
    padding: 10px;
  }
}
```

## Common Mistakes to Avoid

### ❌ Too Many Breakpoints
```css
@media (max-width: 320px) { }
@media (max-width: 480px) { }
@media (max-width: 600px) { }
@media (max-width: 768px) { }
@media (max-width: 900px) { }
@media (max-width: 1024px) { }
```

### ✅ Reasonable Number
```css
@media (max-width: 479px) { }  /* Mobile */
@media (max-width: 767px) { }  /* Phone */
@media (max-width: 1023px) { } /* Tablet */
@media (min-width: 1024px) { } /* Desktop */
```

### ❌ Mobile-Last Approach
```css
/* Large screen styles first */
.container { width: 80%; }
.item { width: 25%; }

/* Then mobile override */
@media (max-width: 767px) {
  .container { width: 100%; }
  .item { width: 100%; }
}
```

### ✅ Mobile-First Approach
```css
/* Mobile styles first */
.container { width: 100%; }
.item { width: 100%; }

/* Then enhance for larger screens */
@media (min-width: 768px) {
  .container { width: 95%; }
  .item { width: 50%; }
}

@media (min-width: 1024px) {
  .container { width: 80%; }
  .item { width: 25%; }
}
```

## Resources

- [MDN: CSS Media Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Media_Queries)
- [CSS-Tricks: A Complete Guide to Grid](https://css-tricks.com/snippets/css/complete-guide-grid/)
- [CSS-Tricks: A Complete Guide to Flexbox](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)
- [Can I Use: CSS Features](https://caniuse.com/)
