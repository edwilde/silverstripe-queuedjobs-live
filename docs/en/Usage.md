# Usage Guide

## Basic Usage

### Enabling Auto-Refresh

1. Navigate to the Queued Jobs admin panel
2. Click the play button (▶) in the top-right corner
3. The page will automatically refresh every 5 seconds
4. The button will change to a pause icon (⏸) when active

### Disabling Auto-Refresh

Click the pause button to stop automatic refreshing.

## Features

### Automatic Polling

When enabled, the module polls the current page every 5 seconds and updates the GridField without a full page reload.

### Session Management

The module monitors your session status:
- If your session expires, polling stops automatically
- A notification appears prompting you to refresh the page
- This prevents unnecessary server requests

### Smart Pausing

The auto-refresh automatically pauses for 10 seconds when you:
- Click any button in the GridField
- Execute a job action
- Interact with the jobs list

This prevents conflicts between your actions and the refresh cycle.

### State Preservation

During refresh, the module preserves:
- Your scroll position on the page
- Currently focused elements (when possible)
- Selected filters and sorting

### Network Error Handling

If a network error occurs:
- Auto-refresh stops automatically
- A notification appears explaining the issue
- You can manually restart polling by clicking the button again

## Visual Feedback

### Loading Indicator

A subtle loading indicator appears during each refresh to show activity.

### Notifications

The module displays notifications for:
- Session expiration
- Network errors
- Other critical events

Notifications can be dismissed by clicking the × button.

## Browser Compatibility

The module is compatible with:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Progressive Enhancement

If JavaScript is disabled:
- The toggle button won't appear
- The admin panel works normally
- Manual page refresh is still available

## Tips

- Enable auto-refresh when monitoring long-running jobs
- Disable it when editing job configurations to avoid interruptions
- The module works best with a stable network connection
- Session timeouts will require a manual page refresh
