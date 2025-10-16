# 🔧 Terminal Input Box Visibility Fix

## Problem
The message input box at the bottom of terminals could disappear or become hidden when:
- Switching between terminals
- Joining/leaving channels
- During message pending states
- When content overflows

## Solution Applied

### 1. **TerminalLayout.tsx** - Container Level
**Changes:**
- Added `overflow-hidden` to prevent layout overflow
- Added `min-h-0` to grid items to allow proper flex shrinking
- Added `overflow-hidden` to terminal containers

```tsx
// Before
<div className="h-full">
  <MainTerminal />
</div>

// After
<div className="h-full min-h-0 overflow-hidden">
  <MainTerminal />
</div>
```

### 2. **MainTerminal.tsx** - Terminal Structure
**Changes:**
- Wrapped header in `flex-shrink-0` to prevent compression
- Added `min-h-0` to scrollable output area
- Wrapped input in `flex-shrink-0` to guarantee visibility
- Added `relative` positioning for better layout control

```tsx
// Structure
<div className="flex flex-col h-full relative">
  {/* Header - never shrinks */}
  <div className="flex-shrink-0">...</div>
  
  {/* Output - grows and scrolls */}
  <div className="flex-1 overflow-y-auto min-h-0">...</div>
  
  {/* Input - always visible, never shrinks */}
  <div className="flex-shrink-0">
    <TerminalInput />
  </div>
</div>
```

### 3. **ChannelTerminal.tsx** - Same Structure
Applied identical fixes as MainTerminal to ensure consistency:
- Header: `flex-shrink-0`
- Messages area: `flex-1 overflow-y-auto min-h-0`
- Input: `flex-shrink-0`

### 4. **TerminalInput.tsx** - Enhanced Input Component
**Changes:**
- Added click handler to container for easy focus
- Added `cursor-text` to container
- Added `autoFocus` attribute to input
- Added refocus after submit to maintain input focus
- Added `flex-shrink-0` to prompt and cursor
- Improved disabled state styling

```tsx
// Container now clickable to focus input
<div onClick={handleContainerClick} className="...cursor-text">
  <span className="flex-shrink-0">{prompt}</span>
  <input autoFocus ... />
  <span className="flex-shrink-0 animate-blink">█</span>
</div>
```

## Key CSS Classes Used

### Flex Layout Control
- `flex-shrink-0` - Prevents element from shrinking (header, input)
- `flex-1` - Allows element to grow and fill space (output area)
- `min-h-0` - Allows flex children to shrink below content size

### Overflow Management
- `overflow-hidden` - Prevents parent overflow
- `overflow-y-auto` - Enables vertical scrolling in content area
- `h-full` - Takes full height of parent

### Positioning
- `relative` - Creates positioning context
- `absolute` - For scanline effects

## How It Works

### Layout Hierarchy
```
TerminalLayout (h-screen overflow-hidden)
└─ Grid Container (h-full)
   ├─ Terminal Wrapper (h-full min-h-0 overflow-hidden)
   │  └─ MainTerminal (flex flex-col h-full)
   │     ├─ Header (flex-shrink-0) ← Never shrinks
   │     ├─ Output (flex-1 min-h-0) ← Grows & scrolls
   │     └─ Input (flex-shrink-0) ← Always visible
   │
   └─ Channel Wrapper (h-full min-h-0 overflow-hidden)
      └─ ChannelTerminal (flex flex-col h-full)
         ├─ Header (flex-shrink-0) ← Never shrinks
         ├─ Messages (flex-1 min-h-0) ← Grows & scrolls
         └─ Input (flex-shrink-0) ← Always visible
```

## Benefits

✅ **Input always visible** - `flex-shrink-0` guarantees input never disappears  
✅ **Proper scrolling** - Only content area scrolls, not the entire terminal  
✅ **Consistent layout** - Same structure in both MainTerminal and ChannelTerminal  
✅ **Auto-focus** - Input automatically focuses when mounted  
✅ **Click-to-focus** - Clicking anywhere in input area focuses the input  
✅ **Maintains focus** - Input refocuses after submitting commands  
✅ **Responsive** - Works when switching between 1 and 2 column layouts  

## Testing Checklist

- [x] Input visible in main terminal
- [x] Input visible in channel terminal  
- [x] Input remains visible when joining channel
- [x] Input remains visible when leaving channel
- [x] Input remains visible during pending message states
- [x] Input remains visible when content overflows
- [x] Scrolling works correctly in output areas
- [x] Input maintains focus after command submission
- [x] Clicking input container focuses the input
- [x] Layout switches smoothly between 1 and 2 columns

## Technical Details

### Why `min-h-0` is Critical
By default, flex items have `min-height: auto`, which prevents them from shrinking below their content size. Adding `min-h-0` allows the scrollable content area to shrink and enable scrolling when content exceeds available space.

### Why `flex-shrink-0` for Input
Without `flex-shrink-0`, the input box could be compressed by the growing content area. This class ensures the input maintains its natural height regardless of content size.

### Why `overflow-hidden` on Parent
Prevents the entire layout from overflowing the screen when content is large. This ensures only the designated scrollable areas scroll.

## Files Modified

1. `components/terminal/TerminalLayout.tsx`
2. `components/terminal/MainTerminal.tsx`
3. `components/terminal/ChannelTerminal.tsx`
4. `components/terminal/TerminalInput.tsx`

## Result

The input box now:
- ✅ Never disappears under any circumstance
- ✅ Always stays at the bottom of each terminal
- ✅ Maintains consistent layout across all states
- ✅ Automatically focuses for better UX
- ✅ Works seamlessly in both single and dual terminal views

---

**Status:** ✅ Fixed and Tested  
**Last Updated:** October 16, 2025

