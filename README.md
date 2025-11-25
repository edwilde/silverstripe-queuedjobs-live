# SilverStripe Queued Jobs Live

Adds live auto-refresh capability to the SilverStripe Queued Jobs admin panel.

## Features

- Play/pause toggle button positioned next to the filter button
- Auto-refresh every 5 seconds without full page reload
- Subtle refresh indicator in the button icon (no intrusive popups)
- Preserves scroll position and focus state
- Smart pausing (10 seconds) on user interaction
- Session timeout detection and handling
- Network error handling with notifications
- Button persists through DOM updates (MutationObserver ensures it remains available)
- Progressive enhancement (graceful degradation when JavaScript is disabled)
- Comprehensive automated test coverage (Jest + PHPUnit)

## Installation

```bash
composer require edwilde/silverstripe-queuedjobs-live
```

## Usage

Once installed, the Queued Jobs admin panel will automatically include a play/pause button positioned to the left of the "Filter" button. Click it to enable automatic refreshing of the jobs grid every 5 seconds.

The button uses a subtle outline style and shows a spinning refresh icon while updating.

## Development

```bash
# Install dependencies
npm install

# Build for development
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:js:watch

# Lint code
npm run lint
```

## Requirements

- SilverStripe Framework ^4.0 || ^5.0
- symbiote/silverstripe-queuedjobs ^4.0 || ^5.0

## License

BSD-3-Clause
