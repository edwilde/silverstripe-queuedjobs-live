/**
 * @jest-environment jsdom
 */

/**
 * Tests for QueuedJobsLiveRefresh module.
 *
 * Verifies initialization, polling, state management, and error handling.
 */
describe('QueuedJobsLiveRefresh', () => {
    let originalFetch;
    let consoleErrorSpy;

    beforeEach(() => {
        // Clear module cache to get fresh instance each test
        jest.resetModules();

        // Clear all timers and intervals from previous tests
        jest.clearAllTimers();
        jest.useFakeTimers();

        // Reset DOM
        document.body.innerHTML = `
            <form class="queuedjobs-live-enabled cms-edit-form">
                <div class="cms-content-toolbar">
                    <button name="showFilter" type="button">Filter</button>
                </div>
                <div class="ss-gridfield">
                    <table class="grid-field__table">
                        <thead><tr><th>Title</th></tr></thead>
                        <tbody><tr><td>Job 1</td></tr></tbody>
                        <tfoot><tr><td>1 item</td></tr></tfoot>
                    </table>
                </div>
                <div class="btn-toolbar">
                    <input type="submit" name="action_createjob" value="Create new job" id="action_createjob">
                </div>
            </form>
        `;

        // Mock fetch with default successful response
        originalFetch = global.fetch;
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            redirected: false,
            text: () => Promise.resolve('<div class="ss-gridfield"><table class="grid-field__table"><thead><tr><th>Title</th></tr></thead><tbody><tr><td>Updated Job</td></tr></tbody><tfoot><tr><td>1 item</td></tr></tfoot></table></div>')
        });

        // Suppress expected console.error calls during tests
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        global.fetch = originalFetch;
        consoleErrorSpy.mockRestore();
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    describe('Initialization', () => {
        test('creates toggle button when form is present', () => {
            require('../../client/src/queuedjobs-admin.js');

            const button = document.querySelector('.queuedjobs-live-toggle');
            expect(button).toBeTruthy();
            expect(button.type).toBe('button');
        });

        test('creates button on jQuery pjax:end event', () => {
            // Set up jQuery mock before requiring the module
            global.jQuery = jest.fn(() => ({
                on: jest.fn((event, callback) => {
                    if (event === 'pjax:end') {
                        // Store callback to trigger later
                        global.jQuery._pjaxCallback = callback;
                    }
                })
            }));

            require('../../client/src/queuedjobs-admin.js');

            // Remove button to simulate navigation away
            let button = document.querySelector('.queuedjobs-live-toggle');
            if (button) {
                button.remove();
            }

            // Trigger the stored jQuery pjax:end callback
            if (global.jQuery._pjaxCallback) {
                global.jQuery._pjaxCallback();
            }

            button = document.querySelector('.queuedjobs-live-toggle');
            expect(button).toBeTruthy();

            // Clean up
            delete global.jQuery;
        });

        test('creates button on cms-content-loaded event', () => {
            require('../../client/src/queuedjobs-admin.js');

            // Remove button to simulate navigation away
            let button = document.querySelector('.queuedjobs-live-toggle');
            if (button) {
                button.remove();
            }

            // Simulate CMS content loaded
            const event = new Event('cms-content-loaded');
            window.dispatchEvent(event);

            button = document.querySelector('.queuedjobs-live-toggle');
            expect(button).toBeTruthy();
        });

        test('button is positioned before filter button', () => {
            require('../../client/src/queuedjobs-admin.js');

            const filterButton = document.querySelector('button[name="showFilter"]');
            const toggleButton = document.querySelector('.queuedjobs-live-toggle');

            expect(toggleButton).toBeTruthy();
            expect(filterButton).toBeTruthy();

            // Check that toggle button comes before filter button in DOM
            const buttons = Array.from(document.querySelectorAll('button'));
            const toggleIndex = buttons.indexOf(toggleButton);
            const filterIndex = buttons.indexOf(filterButton);

            expect(toggleIndex).toBeLessThan(filterIndex);
        });

        test('does not create button when form is missing', () => {
            document.body.innerHTML = '<div>No form here</div>';
            require('../../client/src/queuedjobs-admin.js');

            const button = document.querySelector('.queuedjobs-live-toggle');
            expect(button).toBeNull();
        });

        test('does not create duplicate buttons on multiple setup calls', () => {
            require('../../client/src/queuedjobs-admin.js');

            // Trigger setup multiple times
            const event1 = new Event('pjax:end');
            document.dispatchEvent(event1);

            const event2 = new Event('cms-content-loaded');
            window.dispatchEvent(event2);

            // Should only have one button
            const buttons = document.querySelectorAll('.queuedjobs-live-toggle');
            expect(buttons.length).toBe(1);
        });
    });

    describe('Toggle functionality', () => {
        test('clicking button starts polling', () => {
            require('../../client/src/queuedjobs-admin.js');

            const button = document.querySelector('.queuedjobs-live-toggle');
            button.click();

            // State update is async due to animation, advance timers
            jest.advanceTimersByTime(350);

            expect(button.classList.contains('active')).toBe(true);
        });

        test('clicking button twice stops polling', () => {
            require('../../client/src/queuedjobs-admin.js');

            const button = document.querySelector('.queuedjobs-live-toggle');
            button.click();
            jest.advanceTimersByTime(350);
            expect(button.classList.contains('active')).toBe(true);

            button.click();
            jest.advanceTimersByTime(350);
            expect(button.classList.contains('active')).toBe(false);
        });

        test('button shows play icon when inactive', () => {
            require('../../client/src/queuedjobs-admin.js');

            const button = document.querySelector('.queuedjobs-live-toggle');
            const icon = button.querySelector('.toggle-icon');

            expect(icon.textContent).toBe('▶');
        });

        test('button shows pause icon when active', () => {
            require('../../client/src/queuedjobs-admin.js');

            const button = document.querySelector('.queuedjobs-live-toggle');
            button.click();

            // State update is async due to animation
            jest.advanceTimersByTime(350);

            const icon = button.querySelector('.toggle-icon');
            expect(icon.textContent).toBe('⏸');
        });
    });

    describe('Polling mechanism', () => {
        test('fetches without special headers to avoid PJAX requirement', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                redirected: false,
                text: () => Promise.resolve('<div class="ss-gridfield"><table class="grid-field__table"><tbody><tr><td>Job 2</td></tr></tbody></table></div>')
            });

            require('../../client/src/queuedjobs-admin.js');

            const button = document.querySelector('.queuedjobs-live-toggle');
            button.click();

            // Fast-forward to trigger poll
            jest.advanceTimersByTime(100);
            await Promise.resolve();

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    method: 'GET',
                    credentials: 'include'
                })
            );
        });

        test('polls at 5 second intervals', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                redirected: false,
                text: () => Promise.resolve('<div class="ss-gridfield"><table class="grid-field__table"><tbody><tr><td>Job</td></tr></tbody></table></div>')
            });

            require('../../client/src/queuedjobs-admin.js');

            const button = document.querySelector('.queuedjobs-live-toggle');
            button.click();

            // Initial poll
            jest.advanceTimersByTime(100);
            await Promise.resolve();
            expect(global.fetch).toHaveBeenCalledTimes(1);

            // After 5 seconds, should poll again
            jest.advanceTimersByTime(5000);
            await Promise.resolve();
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });
    });

    describe('Smart pausing', () => {
        test('pauses polling when GridField is clicked', () => {
            require('../../client/src/queuedjobs-admin.js');

            const button = document.querySelector('.queuedjobs-live-toggle');
            button.click();

            // State update is async
            jest.advanceTimersByTime(350);

            const gridField = document.querySelector('.ss-gridfield');
            gridField.click();

            // Button should still be active but polling is paused
            expect(button.classList.contains('active')).toBe(true);
        });
    });

    describe('Error handling', () => {
        test('stops polling on network error', async () => {
            global.fetch.mockRejectedValue(new TypeError('Failed to fetch'));

            require('../../client/src/queuedjobs-admin.js');

            const button = document.querySelector('.queuedjobs-live-toggle');
            button.click();

            jest.advanceTimersByTime(100);
            await Promise.resolve();
            await Promise.resolve(); // Let error handler complete

            expect(button.classList.contains('active')).toBe(false);
        });

        test('handles session expiration', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                redirected: true,
                url: 'https://example.com/Security/login',
                text: () => Promise.resolve('<html></html>')
            });

            require('../../client/src/queuedjobs-admin.js');

            const button = document.querySelector('.queuedjobs-live-toggle');
            button.click();

            jest.advanceTimersByTime(100);
            await Promise.resolve();
            await Promise.resolve();

            expect(button.classList.contains('active')).toBe(false);
        });
    });

    describe('State preservation', () => {
        test('preserves scroll position after update', async () => {
            window.scrollTo = jest.fn();
            window.pageYOffset = 500;

            global.fetch.mockResolvedValue({
                ok: true,
                redirected: false,
                text: () => Promise.resolve(`
                    <html>
                        <body>
                            <div class="ss-gridfield"><table class="grid-field__table"><tbody><tr><td>Updated</td></tr></tbody></table></div>
                        </body>
                    </html>
                `)
            });

            require('../../client/src/queuedjobs-admin.js');

            const button = document.querySelector('.queuedjobs-live-toggle');
            button.click();

            jest.advanceTimersByTime(100);
            await Promise.resolve();
            await Promise.resolve();

            expect(window.scrollTo).toHaveBeenCalledWith(0, 500);
        });
    });

    describe('Button styling', () => {
        test('adds refreshing class during fetch', async () => {
            let resolvePromise;
            global.fetch.mockReturnValue(new Promise(resolve => {
                resolvePromise = resolve;
            }));

            require('../../client/src/queuedjobs-admin.js');

            const button = document.querySelector('.queuedjobs-live-toggle');
            button.click();

            jest.advanceTimersByTime(100);
            await Promise.resolve();

            expect(button.classList.contains('refreshing')).toBe(true);

            resolvePromise({
                ok: true,
                redirected: false,
                text: () => Promise.resolve('<div class="ss-gridfield"><table class="grid-field__table"><tbody><tr><td>Job</td></tr></tbody></table></div>')
            });

            await Promise.resolve();
            await Promise.resolve();

            expect(button.classList.contains('refreshing')).toBe(false);
        });
    });

    describe('DOM persistence', () => {
        test('recreates button if removed by DOM changes', async () => {
            jest.useRealTimers(); // Need real timers for MutationObserver

            global.fetch.mockResolvedValue({
                ok: true,
                redirected: false,
                text: () => Promise.resolve('<div class="ss-gridfield"><table class="grid-field__table"><tbody><tr><td>Job</td></tr></tbody></table></div>')
            });

            require('../../client/src/queuedjobs-admin.js');

            // Wait for initial setup
            await new Promise(resolve => setTimeout(resolve, 50));

            let button = document.querySelector('.queuedjobs-live-toggle');
            expect(button).toBeTruthy();

            // Simulate DOM update that removes the button (like GridField PJAX)
            button.remove();

            // Wait for MutationObserver to detect and recreate button
            await new Promise(resolve => setTimeout(resolve, 150));

            button = document.querySelector('.queuedjobs-live-toggle');
            expect(button).toBeTruthy();
        });

        test('maintains polling state after button recreation', async () => {
            jest.useRealTimers(); // Need real timers for MutationObserver

            global.fetch.mockResolvedValue({
                ok: true,
                redirected: false,
                text: () => Promise.resolve('<div class="ss-gridfield"><table class="grid-field__table"><tbody><tr><td>Job</td></tr></tbody></table></div>')
            });

            require('../../client/src/queuedjobs-admin.js');

            // Wait for initial setup
            await new Promise(resolve => setTimeout(resolve, 50));

            const button = document.querySelector('.queuedjobs-live-toggle');
            expect(button).toBeTruthy();
            button.click();

            // Wait for async state update (animation delay is 300ms + 150ms)
            await new Promise(resolve => setTimeout(resolve, 500));

            expect(button.classList.contains('active')).toBe(true);

            // Simulate DOM update that removes the button
            button.remove();

            // Wait for recreation and state update (MutationObserver + animation)
            await new Promise(resolve => setTimeout(resolve, 600));

            const newButton = document.querySelector('.queuedjobs-live-toggle');
            expect(newButton).toBeTruthy();
            expect(newButton.classList.contains('active')).toBe(true);
        });
    });
});
