# Technical Documentation

## Architecture

### Overview

This module extends the SilverStripe Queued Jobs admin interface to add live auto-refresh functionality. It uses a page-scraping approach to avoid requiring custom API endpoints while maintaining session authentication.

### Components

#### PHP Extension

**File:** `src/QueuedJobsAdminExtension.php`

Extends `QueuedJobsAdmin::getEditForm()` to:
- Register JavaScript and CSS assets via `Requirements`
- Add a CSS class to the form for JavaScript targeting

#### JavaScript Module

**File:** `client/src/queuedjobs-admin.js`

Implements:
- Play/pause toggle UI
- Async polling logic using `fetch()` with `credentials: 'include'`
- DOM parsing to extract GridField from response HTML
- GridField replacement while preserving state
- Error handling and session management

#### Stylesheet

**File:** `client/src/queuedjobs-admin.css`

Defines:
- Play/pause button styles
- Loading indicator animation
- Notification styles
- Responsive design adjustments

## Implementation Details

### Polling Mechanism

1. **Interval:** 5 seconds (configurable via `pollDelay` property)
2. **Method:** Fetches current page URL with session cookies (full page, not PJAX)
3. **Parsing:** Uses DOMParser to extract GridField from response HTML
4. **Update:** Replaces only the table element, not the entire GridField container
5. **Headers:** No special headers to avoid SilverStripe's X-Pjax requirement

### DOM Persistence

- **MutationObserver** watches for DOM changes
- Automatically recreates the button if removed by other scripts (e.g., GridField PJAX updates)
- Maintains polling state through DOM updates
- Ensures button remains available even when GridField updates itself

### CMS Integration

- Listens for SilverStripe CMS PJAX events (`pjax:end`, `cms-content-loaded`)
- Button automatically appears when navigating back to Queued Jobs admin
- Works seamlessly with CMS navigation without requiring full page refresh
- Prevents duplicate button creation on multiple setup calls

### State Preservation

- **Scroll Position:** Saved before update, restored after
- **Focus State:** Attempts to restore focus to previously focused element
- **Form State:** GridField state (filters, sorting) preserved automatically

### Smart Pausing

- Detects clicks on GridField actions
- Pauses polling for 10 seconds after interaction
- Prevents conflicts during user operations

### Session Handling

- Detects redirects to login page
- Stops polling on session expiration
- Shows notification to user

### Error Handling

- Network errors stop polling
- Failed requests logged to console
- User notified of errors via UI

## Security Considerations

### CSRF Tokens

- Uses GET requests for read-only operations
- No CSRF token required for GridField refresh
- Session authentication maintained via cookies
- Does not use X-Pjax header to avoid URL restrictions
- Fetches full page and extracts GridField via DOM parsing

### XSS Prevention

- No user input accepted
- DOM manipulation uses browser APIs
- No innerHTML with user data

### Session Security

- Respects existing session management
- No credentials stored or transmitted
- Uses same-origin policy

## Performance

### Optimization

- Minimal DOM manipulation
- Efficient element replacement
- Debounced interaction detection
- Automatic cleanup on page unload

### Network

- 5-second polling interval balances freshness and load
- Requests include `X-Requested-With` header
- Credentials included automatically

### Memory

- Event listeners cleaned up properly
- Intervals cleared on stop
- MutationObserver disconnected on cleanup
- No memory leaks in long-running sessions

## Browser Support

- Modern browsers with ES6 support
- Fetch API required
- DOMParser required
- Falls back gracefully if JavaScript disabled

## Extension Points

To customize behavior, modify:

- `pollDelay`: Change polling interval (milliseconds)
- `pauseOnInteractionDelay`: Change pause duration after interaction
- CSS classes for styling customization

## Testing

### Manual Testing Checklist

- [ ] Toggle button appears
- [ ] Auto-refresh updates GridField
- [ ] Scroll position preserved
- [ ] Focus state maintained
- [ ] Pauses on interaction
- [ ] Handles session timeout
- [ ] Handles network errors
- [ ] Works on mobile devices
- [ ] No JavaScript errors in console
- [ ] No memory leaks over time

### Browser Testing

Test in all supported browsers:
- Chrome/Edge (Chromium)
- Firefox
- Safari

## Future Enhancements

Potential improvements:
- Configurable poll interval via CMS
- WebSocket support for real-time updates
- Partial updates (only changed rows)
- Custom events for integration
- Admin interface for module settings
