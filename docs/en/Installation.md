# Installation Guide

## Requirements

- SilverStripe Framework ^4.0 || ^5.0
- symbiote/silverstripe-queuedjobs ^4.0 || ^5.0
- Node.js and npm (for development only)

## Installation via Composer

```bash
composer require edwilde/silverstripe-queuedjobs-live
```

## Manual Installation

1. Clone or download this repository into your SilverStripe project
2. Place it in the root directory or vendor folder
3. Run `composer install` or `composer update`
4. Run `db:build?flush=all` in your browser

## Post-Installation

After installation, the module will automatically:
- Extend the QueuedJobsAdmin controller
- Add the play/pause toggle button to the admin interface
- Enable live refresh functionality

No additional configuration is required.

## Verification

1. Log into your SilverStripe admin panel
2. Navigate to the Queued Jobs section
3. Look for a play/pause button in the top-right corner
4. Click the button to enable auto-refresh

## Troubleshooting

### Button not appearing

- Clear your browser cache
- Run `db:build?flush=all`
- Check browser console for JavaScript errors
- Verify the module is installed correctly with `composer show`

### Auto-refresh not working

- Check that you're logged in (session must be valid)
- Check browser console for errors
- Verify network connectivity
- Try manually refreshing the page

### JavaScript errors

- Ensure client/dist/ files exist
- Try rebuilding with `npm run dev` (for developers)
- Check for JavaScript conflicts with other modules
