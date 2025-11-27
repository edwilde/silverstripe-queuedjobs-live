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

            // Listen for CMS navigation events
            window.addEventListener('cms-content-loaded', () => this.setup());

            // SilverStripe CMS uses jQuery PJAX
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

            // If we're currently polling, set the active state immediately
            if (this.isPolling) {
                button.classList.add('active');
                button.setAttribute('aria-label', 'Toggle auto-refresh. Currently running.');
                button.setAttribute('aria-pressed', 'true');
                const icon = button.querySelector('.toggle-icon');
                const label = button.querySelector('.visually-hidden');
                if (icon) icon.textContent = '⏸';
                if (label) label.textContent = 'Stop auto-refresh';
            }

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
         * Attach global event listeners for smart pausing and cleanup.
         * Only attaches once to prevent duplicate listeners.
         */
        attachEventListeners() {
            // Only attach if not already attached
            if (this.listenersAttached) {
                return;
            }
            this.listenersAttached = true;

            // Pause polling when user interacts with GridField (but not the create job button)
            document.addEventListener('click', (e) => {
                // Don't pause for the create job button - we handle that separately
                const isCreateJobButton = e.target.closest('#action_createjob, input[name="action_createjob"], button[name="action_createjob"]');
                if (isCreateJobButton) {
                    return;
                }

                if (e.target.closest('.action, .gridfield-button-row, .ss-gridfield')) {
                    this.pauseOnInteraction();
                }
            });

            // When "Create new job" is clicked and auto-refresh is running,
            // trigger a refresh after a delay to show the new job
            document.addEventListener('click', (e) => {
                const createJobButton = e.target.closest('#action_createjob, input[name="action_createjob"], button[name="action_createjob"]');
                if (createJobButton && this.isPolling) {
                    // Wait for the form submission to complete, then refresh
                    setTimeout(() => {
                        this.poll();
                    }, 1500);
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
                    // Button was removed, re-create it (state is set in createToggleButton)
                    this.createToggleButton();
                } else {
                    // Update our reference to the button in the DOM
                    this.toggleButton = button;

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
            if (this.interactionTimeout) {
                clearTimeout(this.interactionTimeout);
            }
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
         * Uses diff-based updates to only modify changed rows, preventing flicker.
         *
         * @param {string} html - The full HTML response from the server
         */
        updateGridField(html) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const newTbody = doc.querySelector('.grid-field__table tbody, table.ss-gridfield-table tbody');
            const currentTbody = document.querySelector('.grid-field__table tbody, table.ss-gridfield-table tbody');

            const newTfoot = doc.querySelector('.grid-field__table tfoot, table.ss-gridfield-table tfoot');
            const currentTfoot = document.querySelector('.grid-field__table tfoot, table.ss-gridfield-table tfoot');

            if (newTbody && currentTbody) {
                // Quick check: compare normalized HTML to detect any changes
                const currentHtml = this.normalizeHtml(currentTbody.innerHTML);
                const newHtml = this.normalizeHtml(newTbody.innerHTML);
                
                const currentFootHtml = currentTfoot ? this.normalizeHtml(currentTfoot.innerHTML) : '';
                const newFootHtml = newTfoot ? this.normalizeHtml(newTfoot.innerHTML) : '';
                
                // If nothing changed, don't touch the DOM at all
                if (currentHtml === newHtml && currentFootHtml === newFootHtml) {
                    return;
                }

                const activeElement = document.activeElement;
                const activeElementSelector = this.getElementSelector(activeElement);
                const isInsideTbody = currentTbody.contains(activeElement);

                // Add class to disable CSS transitions during update
                const table = currentTbody.closest('table');
                if (table) {
                    table.classList.add('queuedjobs-live-updating');
                }

                // Diff and patch tbody rows
                this.diffAndPatch(currentTbody, newTbody);

                // Diff and patch tfoot if present
                if (newTfoot && currentTfoot) {
                    this.diffAndPatch(currentTfoot, newTfoot);
                }

                // Remove updating class after a microtask to ensure DOM has settled
                if (table) {
                    requestAnimationFrame(() => {
                        table.classList.remove('queuedjobs-live-updating');
                    });
                }

                // Restore focus if it was outside the updated area
                if (activeElementSelector && !isInsideTbody) {
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
         * Normalize HTML for comparison by removing insignificant whitespace
         * and action columns (which get JS-enhanced and always differ).
         *
         * @param {string} html - HTML string to normalize
         * @return {string} Normalized HTML string
         */
        normalizeHtml(html) {
            return html
                .replace(/<td[^>]*class="[^"]*col-Actions[^"]*"[^>]*>[\s\S]*?<\/td>/gi, '')  // Remove action columns
                .replace(/<td[^>]*class="[^"]*grid-field__col-compact[^"]*"[^>]*>[\s\S]*?<\/td>/gi, '')  // Remove compact action columns
                .replace(/>\s+</g, '><')  // Remove whitespace between tags
                .replace(/\s+/g, ' ')      // Collapse multiple spaces
                .trim();
        }

        /**
         * Diff two DOM elements and apply minimal changes.
         * Compares children by data-id attribute or position, updating only what changed.
         *
         * @param {Element} current - The current DOM element
         * @param {Element} updated - The new DOM element with updates
         */
        diffAndPatch(current, updated) {
            const currentRows = Array.from(current.children);
            const updatedRows = Array.from(updated.children);

            // Build a map of current rows by their data-id (GridField row identifier)
            const currentById = new Map();
            currentRows.forEach((row, index) => {
                const id = row.getAttribute('data-id') || `pos-${index}`;
                currentById.set(id, row);
            });

            // Build ordered list of updated row IDs
            const updatedIds = updatedRows.map((row, index) =>
                row.getAttribute('data-id') || `pos-${index}`
            );

            // Track which current rows we've matched
            const matched = new Set();

            // Process each updated row in order
            updatedRows.forEach((newRow, index) => {
                const id = updatedIds[index];
                const existingRow = currentById.get(id);

                if (existingRow) {
                    matched.add(id);
                    // Row exists - update cells and attributes only if changed
                    this.diffRowCells(existingRow, newRow);
                    // Ensure row is in correct position
                    if (current.children[index] !== existingRow) {
                        current.insertBefore(existingRow, current.children[index]);
                    }
                } else {
                    // New row - insert at correct position
                    const clonedRow = newRow.cloneNode(true);
                    if (current.children[index]) {
                        current.insertBefore(clonedRow, current.children[index]);
                    } else {
                        current.appendChild(clonedRow);
                    }
                }
            });

            // Remove rows that no longer exist
            currentRows.forEach(row => {
                const id = row.getAttribute('data-id') ||
                    `pos-${currentRows.indexOf(row)}`;
                if (!matched.has(id) && !updatedIds.includes(id)) {
                    row.remove();
                }
            });
        }

        /**
         * Diff cells within a row and update only changed cells.
         * Uses textContent comparison for speed, only falls back to innerHTML when needed.
         *
         * @param {Element} currentRow - The current row element
         * @param {Element} newRow - The new row element with updates
         */
        diffRowCells(currentRow, newRow) {
            const currentCells = Array.from(currentRow.children);
            const newCells = Array.from(newRow.children);

            // Update existing cells
            for (let i = 0; i < Math.max(currentCells.length, newCells.length); i++) {
                if (i < newCells.length && i < currentCells.length) {
                    const currentCell = currentCells[i];
                    const newCell = newCells[i];
                    
                    // Skip action columns - they get enhanced by JS after page load
                    // and will always differ between fetched HTML and live DOM
                    if (currentCell.classList.contains('col-Actions') || 
                        currentCell.classList.contains('grid-field__col-compact') ||
                        currentCell.querySelector('.grid-field__icon-action, .gridfield-button-delete, .action-menu')) {
                        continue;
                    }
                    
                    // First check if textContent differs (fast check)
                    const currentText = currentCell.textContent;
                    const newText = newCell.textContent;
                    
                    if (currentText !== newText) {
                        // Content differs - check if it's just text or has HTML structure
                        if (newCell.children.length === 0 && currentCell.children.length === 0) {
                            // Both are text-only, use faster textContent
                            currentCell.textContent = newText;
                        } else {
                            // Has child elements, need innerHTML
                            currentCell.innerHTML = newCell.innerHTML;
                        }
                    }
                    // Sync attributes only if they differ
                    this.syncAttributesIfChanged(currentCell, newCell);
                } else if (i >= currentCells.length) {
                    // New cell - append
                    currentRow.appendChild(newCells[i].cloneNode(true));
                } else {
                    // Extra cell - remove
                    currentCells[i].remove();
                }
            }

            // Sync row attributes only if changed
            this.syncAttributesIfChanged(currentRow, newRow);
        }

        /**
         * Sync attributes from source to target, but only if they actually differ.
         * Avoids unnecessary DOM mutations that trigger style recalculations.
         *
         * @param {Element} target - Element to update
         * @param {Element} source - Element to copy attributes from
         */
        syncAttributesIfChanged(target, source) {
            let hasChanges = false;
            
            // Check if any attributes need updating
            for (const attr of source.attributes) {
                if (target.getAttribute(attr.name) !== attr.value) {
                    hasChanges = true;
                    break;
                }
            }
            
            // Check if any attributes need removing
            if (!hasChanges) {
                for (const attr of target.attributes) {
                    if (!source.hasAttribute(attr.name)) {
                        hasChanges = true;
                        break;
                    }
                }
            }
            
            // Only mutate DOM if there are actual changes
            if (hasChanges) {
                // Update/add attributes from source
                for (const attr of source.attributes) {
                    if (target.getAttribute(attr.name) !== attr.value) {
                        target.setAttribute(attr.name, attr.value);
                    }
                }
                // Remove attributes not in source
                for (const attr of Array.from(target.attributes)) {
                    if (!source.hasAttribute(attr.name)) {
                        target.removeAttribute(attr.name);
                    }
                }
            }
            
            return hasChanges;
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
