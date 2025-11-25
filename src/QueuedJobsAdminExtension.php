<?php

namespace EdWilde\QueuedJobsLive;

use SilverStripe\Core\Extension;
use SilverStripe\Forms\Form;
use SilverStripe\View\Requirements;

/**
 * Extension for QueuedJobsAdmin that adds live auto-refresh functionality.
 * 
 * This extension adds JavaScript and CSS assets to enable a play/pause toggle
 * button that automatically refreshes the jobs GridField every 5 seconds without
 * requiring a full page reload.
 * 
 * @package EdWilde\QueuedJobsLive
 */
class QueuedJobsAdminExtension extends Extension
{
    /**
     * Update the edit form to include live refresh assets and CSS class.
     * 
     * Registers the JavaScript module and CSS stylesheet required for the
     * live refresh functionality, and adds a CSS class to the form that
     * the JavaScript uses to identify the correct form to enhance.
     * 
     * @param Form $form The form being updated
     * @return Form The modified form
     */
    public function updateEditForm($form)
    {
        // Register JavaScript module for live refresh functionality
        Requirements::javascript('edwilde/silverstripe-queuedjobs-live: client/dist/queuedjobs-admin.js');
        
        // Register CSS for the play/pause button and styling
        Requirements::css('edwilde/silverstripe-queuedjobs-live: client/dist/queuedjobs-admin.css');
        
        // Add CSS class for JavaScript to target this form
        $form->addExtraClass('queuedjobs-live-enabled');
        
        return $form;
    }
}
