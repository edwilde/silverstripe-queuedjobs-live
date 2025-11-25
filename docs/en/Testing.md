# Testing Guide

## Overview

This module includes comprehensive automated test coverage for both PHP and JavaScript components.

## Running Tests

### All Tests

```bash
npm test
```

This runs both JavaScript and PHP tests.

### JavaScript Tests

```bash
# Run all JavaScript tests
npm run test:js

# Run tests in watch mode (for development)
npm run test:js:watch

# Run tests with coverage report
npm run test:js:coverage
```

### PHP Tests

```bash
# Run PHP tests
npm run test:php

# Or directly with PHPUnit
vendor/bin/phpunit

# With coverage
vendor/bin/phpunit --coverage-html coverage-php
```

### Linting

```bash
npm run lint
```

## Test Structure

### JavaScript Tests

**Location:** `tests/js/queuedjobs-admin.test.js`

**Framework:** Jest with jsdom

**Coverage:**
- Initialization and DOM manipulation
- Toggle button functionality
- Polling mechanism with correct headers
- Smart pausing on user interaction
- Error handling (network errors, session expiration)
- State preservation (scroll position, focus)
- Button styling during refresh

### PHP Tests

**Location:** `tests/php/QueuedJobsAdminExtensionTest.php`

**Framework:** PHPUnit with SilverStripe SapphireTest

**Coverage:**
- Extension properly applied to QueuedJobsAdmin
- JavaScript assets registered via Requirements
- CSS assets registered via Requirements
- Form receives correct CSS class
- updateEditForm returns Form instance

## Continuous Integration

GitHub Actions automatically runs:
- JavaScript tests on Node.js 16, 18, and 20
- PHP tests on PHP 7.4, 8.0, 8.1, 8.2
- Tests against SilverStripe 4 and 5
- Linting checks
- Build verification
- Code coverage reporting

## Writing New Tests

### JavaScript Test Example

```javascript
describe('New Feature', () => {
    test('does something', () => {
        // Arrange
        const element = document.createElement('div');
        
        // Act
        element.click();
        
        // Assert
        expect(element.classList.contains('active')).toBe(true);
    });
});
```

### PHP Test Example

```php
public function testNewFeature()
{
    $admin = QueuedJobsAdmin::create();
    $form = Form::create($admin, 'TestForm');
    
    $extension = new QueuedJobsAdminExtension();
    $extension->setOwner($admin);
    
    // Test something
    $this->assertTrue($condition);
}
```

## Test Coverage Goals

- **JavaScript:** >80% coverage
- **PHP:** >90% coverage

View coverage reports:
- JavaScript: `coverage/index.html`
- PHP: `coverage-php/index.html`

## Common Issues

### Jest Tests Failing

If tests fail with "Cannot find module":
```bash
npm install
```

### PHP Tests Failing

If tests fail with "Class not found":
```bash
composer install
```

### Mock Not Working

Ensure mocks are set up in `beforeEach` and cleaned up in `afterEach`:
```javascript
beforeEach(() => {
    global.fetch = jest.fn();
});

afterEach(() => {
    jest.clearAllMocks();
});
```

## Test Data

Tests use minimal fixtures and mocks to avoid dependencies on external services or databases.

### JavaScript Fixtures

DOM structure mimics actual SilverStripe admin:
```html
<form class="queuedjobs-live-enabled">
    <button name="showFilter">Filter</button>
    <div class="ss-gridfield">...</div>
</form>
```

### PHP Fixtures

Uses `$usesDatabase = false` to avoid database requirements.

## Debugging Tests

### JavaScript

```bash
# Run single test file
npx jest tests/js/queuedjobs-admin.test.js

# Run tests matching pattern
npx jest -t "polling mechanism"

# Debug in Node
node --inspect-brk node_modules/.bin/jest --runInBand
```

### PHP

```bash
# Run single test
vendor/bin/phpunit --filter testExtensionApplied

# Debug with verbose output
vendor/bin/phpunit --debug
```

## Best Practices

1. **Write tests first** (TDD) when adding new features
2. **Keep tests isolated** - no dependencies between tests
3. **Use descriptive test names** - explain what is being tested
4. **Mock external dependencies** - fetch, timers, etc.
5. **Test edge cases** - not just happy paths
6. **Clean up after tests** - restore mocks, clear timers
7. **Maintain high coverage** - aim for >80%

## Manual Testing Checklist

While automated tests cover most functionality, some aspects require manual testing:

- [ ] Visual appearance in different browsers
- [ ] Button positioning relative to filter button
- [ ] Responsive design on mobile devices
- [ ] Performance with large GridFields
- [ ] Integration with different SilverStripe themes
- [ ] Accessibility (keyboard navigation, screen readers)

## Performance Testing

Monitor performance metrics:
- Memory usage over time (check for leaks)
- Network request efficiency
- DOM manipulation speed
- CPU usage during polling

Use browser DevTools Performance tab to profile the JavaScript execution.
