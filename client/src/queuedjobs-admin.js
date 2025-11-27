/**
 * Queued Jobs Live Refresh Module
 *
 * Provides auto-refresh functionality for SilverStripe Queued Jobs admin interface.
 * Adds a play/pause toggle button that polls the current page every 5 seconds and
 * updates just the jobs table without requiring a full page reload.
 *
 * @author Ed Wilde
 * @version 1.0.0
 */
/* global jQuery */
(function() {
    'use strict';

    /**
     * Main class that handles live refresh functionality.
     */
    class QueuedJobsLiveRefresh {
        constructor() {
            // Polling configuration
            this.pollInterval = null;
            this.pollDelay = 5000; // Poll every 5 seconds
            this.pauseOnInteractionDelay = 10000; // Pause for 10 seconds after user interaction

            // State tracking
            this.isPolling = false;
            this.isPaused = false;
            this.interactionTimeout = null;
            this.scrollPosition = 0;

            // DOM elements
            this.toggleButton = null;
            this.loadingIndicator = null;
            this.observer = null;
            this.listenersAttached = false;

            this.init();
        }

        /**
         * Initialize the module when DOM is ready or when CMS loads content via PJAX.
         */
        init() {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setup());
            } else {
                this.setup();
            }

            // Listen for various CMS PJAX navigation events
            // SilverStripe CMS uses jQuery PJAX, so we need multiple event listeners
            document.addEventListener('pjax:end', () => this.setup());
            window.addEventListener('cms-content-loaded', () => this.setup());

            // Also listen on jQuery if available (SilverStripe uses jQuery PJAX)
            if (typeof jQuery !== 'undefined') {
                jQuery(document).on('pjax:end', () => this.setup());
            }

            // Periodically check if button needs to be created (fallback)
            // This handles cases where events don't fire reliably
            setInterval(() => {
                const form = document.querySelector('.queuedjobs-live-enabled');
                const button = document.querySelector('.queuedjobs-live-toggle');
                if (form && !button) {
                    this.setup();
                }
            }, 1000);
        }

        /**
         * Set up the UI components and event listeners.
         * Only runs if we're on a queued jobs admin page.
         * Safe to call multiple times - checks if button already exists.
         */
        setup() {
            const form = document.querySelector('.queuedjobs-live-enabled');
            if (!form) {
                return;
            }

            // Don't create button if it already exists
            if (document.querySelector('.queuedjobs-live-toggle')) {
                return;
            }

            this.createToggleButton();
            this.createLoadingIndicator();
            this.attachEventListeners();
        }

        /**
         * Create and insert the play/pause toggle button.
         * Button is positioned to the left of the filter button.
         * Fully accessible with WCAG 2.2 AA compliance.
         */
        createToggleButton() {
            const button = document.createElement('button');
            button.className = 'queuedjobs-live-toggle btn btn-secondary';
            button.type = 'button';
            button.setAttribute('aria-label', 'Toggle auto-refresh. Currently stopped.');
            button.setAttribute('aria-pressed', 'false');
            button.setAttribute('title', 'Toggle auto-refresh');
            button.innerHTML = '<span class="toggle-icon" aria-hidden="true">▶</span><span class="visually-hidden">Start auto-refresh</span>';

            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.togglePolling();
            });

            // Always position immediately to the left of the filter button
            this.insertButtonBeforeFilter(button);
            this.toggleButton = button;
        }

        /**
         * Insert the button immediately before the filter button.
         * Handles different DOM structures that may occur during GridField updates.
         * Hides button if filter area is open (no filter button visible).
         *
         * @param {HTMLElement} button - The button element to insert
         */
        insertButtonBeforeFilter(button) {
            const filterButton = document.querySelector('button[name="showFilter"], .grid-field__filter-open');
            const gridField = document.querySelector('.ss-gridfield, .grid-field');

            if (!filterButton) {
                // Check if filter is open (has show-filter class)
                if (gridField && gridField.classList.contains('show-filter')) {
                    // Filter is open, hide our button
                    button.style.display = 'none';
                    // Still need to insert it somewhere to keep reference
                    const toolbar = document.querySelector('.cms-content-toolbar') ||
                                  document.querySelector('.cms-content-header');
                    if (toolbar) {
                        toolbar.appendChild(button);
                    }
                }
                return;
            }

            // Filter button found, make sure our button is visible and insert it
            button.style.display = '';
            filterButton.parentNode.insertBefore(button, filterButton);
        }

        /**
         * Placeholder for loading indicator.
         * Loading state is now shown via button styling instead of popup.
         */
        createLoadingIndicator() {
            // Loading state is handled by adding 'refreshing' class to button
        }

        /**
         * Attach global event listeners for smart pausing and cleanup.
         * Only attaches once to prevent duplicate listeners.
         */
        attachEventListeners() {
            // Only attach if not already attached
            if (this.listenersAttached) {
                return;
            }
            this.listenersAttached = true;

            // Pause polling when user interacts with GridField
            document.addEventListener('click', (e) => {
                if (e.target.closest('.action, .gridfield-button-row, .ss-gridfield')) {
                    this.pauseOnInteraction();
                }
            });

            // Clean up resources when page unloads
            window.addEventListener('beforeunload', () => {
                this.cleanup();
            });

            // Watch for DOM changes that might remove our button
            this.setupMutationObserver();
        }

        /**
         * Set up MutationObserver to re-insert button if DOM is updated by other scripts.
         * This ensures the button persists when GridField updates itself via PJAX/AJAX.
         * Only sets up once to avoid multiple observers.
         */
        setupMutationObserver() {
            // Only set up once
            if (this.observer) {
                return;
            }

            const form = document.querySelector('.queuedjobs-live-enabled');
            if (!form) return;

            const observer = new MutationObserver(() => {
                const button = document.querySelector('.queuedjobs-live-toggle');
                const filterButton = document.querySelector('button[name="showFilter"], .grid-field__filter-open');
                const gridField = document.querySelector('.ss-gridfield, .grid-field');

                if (!button) {
                    // Button was removed, re-create it
                    this.createToggleButton();
                    // Restore the active state if we were polling
                    if (this.isPolling) {
                        this.updateButtonState();
                    }
                } else {
                    // Check if filter is open/closed
                    const filterIsOpen = gridField && gridField.classList.contains('show-filter');

                    if (filterIsOpen && !filterButton) {
                        // Filter is open, hide button
                        button.style.display = 'none';
                    } else if (!filterIsOpen && filterButton) {
                        // Filter is closed, ensure button is visible and positioned correctly
                        button.style.display = '';
                        if (button.nextElementSibling !== filterButton) {
                            // Button is not immediately before filter button, re-position it
                            button.remove();
                            this.insertButtonBeforeFilter(button);
                        }
                    }
                }
            });

            // Observe the form and its children for changes
            observer.observe(form, {
                childList: true,
                subtree: true
            });

            // Store observer for cleanup
            this.observer = observer;
        }

        /**
         * Toggle between polling on and off.
         */
        togglePolling() {
            if (this.isPolling) {
                this.stopPolling();
            } else {
                this.startPolling();
            }
            this.updateButtonState();
        }

        /**
         * Start polling for updates.
         * Polls immediately then continues at regular intervals.
         */
        startPolling() {
            if (this.isPolling) return;

            this.isPolling = true;
            this.isPaused = false;
            this.poll();
            this.pollInterval = setInterval(() => this.poll(), this.pollDelay);
        }

        /**
         * Stop polling and clear the interval.
         */
        stopPolling() {
            this.isPolling = false;
            if (this.pollInterval) {
                clearInterval(this.pollInterval);
                this.pollInterval = null;
            }
        }

        /**
         * Clean up resources (called on page unload).
         */
        cleanup() {
            this.stopPolling();
            if (this.observer) {
                this.observer.disconnect();
            }
        }

        /**
         * Temporarily pause polling when user interacts with the GridField.
         * Prevents conflicts between user actions and automatic updates.
         */
        pauseOnInteraction() {
            if (!this.isPolling) return;

            this.isPaused = true;

            if (this.interactionTimeout) {
                clearTimeout(this.interactionTimeout);
            }

            // Resume polling after delay
            this.interactionTimeout = setTimeout(() => {
                this.isPaused = false;
                this.interactionTimeout = null;
            }, this.pauseOnInteractionDelay);
        }

        /**
         * Update the button's visual state (play vs pause icon).
         * Updates ARIA attributes for screen reader accessibility.
         * Timing: 100ms fade out → 200ms wait → 150ms fade in
         */
        updateButtonState() {
            if (!this.toggleButton) return;

            const icon = this.toggleButton.querySelector('.toggle-icon');
            const label = this.toggleButton.querySelector('.visually-hidden');
            if (!icon || !label) return;

            // Fade out (100ms transition)
            icon.style.opacity = '0';

            // Wait for fade out (100ms) + pause (200ms) before changing content
            setTimeout(() => {
                if (this.isPolling) {
                    this.toggleButton.classList.add('active');
                    icon.textContent = '⏸';
                    label.textContent = 'Stop auto-refresh';
                    this.toggleButton.setAttribute('aria-label', 'Toggle auto-refresh. Currently running.');
                    this.toggleButton.setAttribute('aria-pressed', 'true');
                } else {
                    this.toggleButton.classList.remove('active');
                    icon.textContent = '▶';
                    label.textContent = 'Start auto-refresh';
                    this.toggleButton.setAttribute('aria-label', 'Toggle auto-refresh. Currently stopped.');
                    this.toggleButton.setAttribute('aria-pressed', 'false');
                }

                // Update transition for fade in
                icon.style.transition = 'opacity 0.15s ease';

                // Trigger reflow to ensure transition applies
                void icon.offsetHeight;

                // Fade in (150ms transition)
                icon.style.opacity = '1';

                // Reset transition back to default after fade in completes
                setTimeout(() => {
                    icon.style.transition = '';
                }, 150);
            }, 300); // 100ms fade out + 200ms wait
        }

        /**
         * Poll the server for updated job data.
         * Fetches the full page, extracts the jobs table, and updates the DOM.
         */
        async poll() {
            if (this.isPaused) return;

            try {
                this.showLoadingIndicator();

                // Save scroll position to restore after update
                this.scrollPosition = window.pageYOffset || document.documentElement.scrollTop;

                // Fetch as a normal page load (no X-Requested-With header)
                // This avoids SilverStripe's X-Pjax requirement
                const response = await fetch(window.location.href, {
                    method: 'GET',
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                // Check if user's session has expired (redirected to login)
                if (response.redirected && response.url.includes('Security/login')) {
                    this.handleSessionExpired();
                    return;
                }

                const html = await response.text();
                this.updateGridField(html);
                this.hideLoadingIndicator();

            } catch (error) {
                console.error('Failed to refresh queued jobs:', error);
                this.hideLoadingIndicator();

                // Stop polling on network errors and notify user
                if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                    this.stopPolling();
                    this.updateButtonState();
                    this.showNotification('Auto-refresh stopped due to network error');
                }
            }
        }

        /**
         * Update the GridField table with new data from HTML response.
         * Only replaces the table element to preserve buttons and controls.
         *
         * @param {string} html - The full HTML response from the server
         */
        updateGridField(html) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Find only the table element, not the entire GridField container
            const newTable = doc.querySelector('.grid-field__table, table.ss-gridfield-table');
            const currentTable = document.querySelector('.grid-field__table, table.ss-gridfield-table');

            if (newTable && currentTable) {
                const activeElement = document.activeElement;
                const activeElementSelector = this.getElementSelector(activeElement);
                const isInsideTable = activeElement.closest('.grid-field__table, table.ss-gridfield-table') === currentTable;

                // Replace only the table, preserving buttons and other UI
                currentTable.parentNode.replaceChild(
                    document.importNode(newTable, true),
                    currentTable
                );

                // Restore focus if it was outside the table
                if (activeElementSelector && !isInsideTable) {
                    const elementToFocus = document.querySelector(activeElementSelector);
                    if (elementToFocus && elementToFocus !== document.body) {
                        elementToFocus.focus();
                    }
                }

                // Restore scroll position
                if (this.scrollPosition) {
                    window.scrollTo(0, this.scrollPosition);
                }
            }
        }

        /**
         * Generate a CSS selector for an element (for focus restoration).
         *
         * @param {Element} element - The element to generate a selector for
         * @return {string|null} CSS selector or null if not possible
         */
        getElementSelector(element) {
            if (!element || element === document.body) return null;

            if (element.id) {
                return `#${element.id}`;
            }

            if (element.className && typeof element.className === 'string') {
                const classes = element.className.trim().split(/\s+/).join('.');
                if (classes) {
                    return `${element.tagName.toLowerCase()}.${classes}`;
                }
            }

            return null;
        }

        /**
         * Show loading state by adding 'refreshing' class to button.
         */
        showLoadingIndicator() {
            if (this.toggleButton) {
                this.toggleButton.classList.add('refreshing');
            }
        }

        /**
         * Hide loading state by removing 'refreshing' class from button.
         */
        hideLoadingIndicator() {
            if (this.toggleButton) {
                this.toggleButton.classList.remove('refreshing');
            }
        }

        /**
         * Handle session expiration by stopping polling and notifying user.
         */
        handleSessionExpired() {
            this.stopPolling();
            this.updateButtonState();
            this.showNotification('Your session has expired. Please refresh the page to log in again.');
        }

        /**
         * Display a dismissible notification message to the user.
         * Accessible with ARIA live region and proper button labeling.
         *
         * @param {string} message - The message to display
         */
        showNotification(message) {
            const notification = document.createElement('div');
            notification.className = 'queuedjobs-live-notification';
            notification.setAttribute('role', 'alert');
            notification.setAttribute('aria-live', 'assertive');

            const messageSpan = document.createElement('span');
            messageSpan.textContent = message;
            notification.appendChild(messageSpan);

            const closeButton = document.createElement('button');
            closeButton.textContent = '×';
            closeButton.className = 'close-btn';
            closeButton.setAttribute('aria-label', 'Close notification');
            closeButton.setAttribute('type', 'button');
            closeButton.addEventListener('click', () => {
                notification.remove();
            });

            notification.appendChild(closeButton);
            document.body.appendChild(notification);

            // Auto-remove notification after 10 seconds
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 10000);
        }
    }

    // Auto-initialize when script loads
    new QueuedJobsLiveRefresh();
})();
