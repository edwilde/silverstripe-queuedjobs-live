# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-24

### Added
- Initial release
- Play/pause toggle button for auto-refresh functionality
- Auto-refresh polling every 5 seconds
- Smart pausing on user interaction (10 seconds)
- Session timeout detection and handling
- Network error handling with user notifications
- Scroll position preservation during refresh
- Focus state preservation during refresh
- Subtle refresh indicator in button (spinning icon)
- Secondary outline button styling
- Button positioned to left of filter button
- MutationObserver to maintain button through DOM updates
- Comprehensive Jest test suite for JavaScript
- Comprehensive PHPUnit test suite for PHP
- ESLint configuration for code quality
- GitHub Actions CI/CD pipeline
- Full documentation suite (Installation, Usage, Technical, Testing)
- Progressive enhancement support

### Technical
- Page scraping approach using Fetch API
- DOM parsing and GridField extraction
- Memory-safe event listener management
- Proper interval cleanup
- Cross-browser compatibility (Chrome, Firefox, Safari, Edge)
- Responsive design support
- ES6 JavaScript with IIFE wrapper
- SilverStripe Extension pattern
- Requirements API integration

### Security
- Read-only GET requests
- Session authentication via cookies
- CSRF-safe implementation
- XSS prevention
- Same-origin policy compliance
