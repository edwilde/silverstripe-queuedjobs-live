# Contributing

Thank you for considering contributing to this project!

## Development

### Prerequisites

- Node.js and npm
- SilverStripe Framework ^4.0 or ^5.0
- symbiote/silverstripe-queuedjobs ^4.0 or ^5.0

### Setup

1. Clone the repository
2. Run `npm install` to install dependencies
3. Make your changes in `client/src/`
4. Run `npm run dev` to build the files for development
5. Test your changes in a SilverStripe installation

### Building

- `npm run dev` - Copy source files to dist/ (for development)
- `npm run build` - Minify JavaScript and copy CSS to dist/ (for production)
- `npm run watch` - Watch for changes and rebuild automatically

### Code Style

- Follow existing code style
- Use meaningful variable and function names
- Add comments for complex logic
- Test in multiple browsers

### Testing

Test your changes in:
- Chrome
- Firefox
- Safari
- Edge

Ensure:
- Auto-refresh works correctly
- Session timeout is handled gracefully
- Network errors don't break the interface
- User interactions pause the polling
- Scroll position is preserved
- Focus state is maintained

## Submitting Changes

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request with a clear description

## Reporting Issues

When reporting issues, please include:
- SilverStripe version
- Browser and version
- Steps to reproduce
- Expected vs actual behavior
- Console errors (if any)
