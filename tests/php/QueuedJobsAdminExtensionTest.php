<?php

namespace EdWilde\QueuedJobsLive\Tests;

use EdWilde\QueuedJobsLive\QueuedJobsAdminExtension;
use SilverStripe\Dev\SapphireTest;
use SilverStripe\Forms\Form;
use SilverStripe\View\Requirements;
use Symbiote\QueuedJobs\Controllers\QueuedJobsAdmin;

/**
 * Tests for QueuedJobsAdminExtension.
 *
 * Verifies that the extension properly registers assets and modifies the form.
 *
 * @package EdWilde\QueuedJobsLive\Tests
 */
class QueuedJobsAdminExtensionTest extends SapphireTest
{
    /**
     * @var bool No database required for these tests
     */
    protected $usesDatabase = false;

    /**
     * Test that the extension is properly applied to QueuedJobsAdmin.
     */
    public function testExtensionApplied()
    {
        $admin = QueuedJobsAdmin::create();
        $extensions = $admin->getExtensionInstances();

        $hasExtension = false;
        foreach ($extensions as $extension) {
            if ($extension instanceof QueuedJobsAdminExtension) {
                $hasExtension = true;
                break;
            }
        }

        $this->assertTrue(
            $hasExtension,
            'QueuedJobsAdmin should have QueuedJobsAdminExtension applied'
        );
    }

    /**
     * Test that JavaScript file is registered via Requirements.
     */
    public function testUpdateEditFormAddsJavaScript()
    {
        Requirements::clear();

        $admin = QueuedJobsAdmin::create();
        $form = Form::create($admin, 'TestForm');

        $extension = new QueuedJobsAdminExtension();
        $extension->setOwner($admin);
        $extension->updateEditForm($form);

        $javascript = Requirements::backend()->getJavascript();

        $hasQueuedJobsJS = false;
        foreach ($javascript as $file => $attrs) {
            if (strpos($file, 'queuedjobs-admin.js') !== false) {
                $hasQueuedJobsJS = true;
                break;
            }
        }

        $this->assertTrue(
            $hasQueuedJobsJS,
            'JavaScript file should be registered'
        );

        Requirements::clear();
    }

    /**
     * Test that CSS file is registered via Requirements.
     */
    public function testUpdateEditFormAddsCSS()
    {
        Requirements::clear();

        $admin = QueuedJobsAdmin::create();
        $form = Form::create($admin, 'TestForm');

        $extension = new QueuedJobsAdminExtension();
        $extension->setOwner($admin);
        $extension->updateEditForm($form);

        $css = Requirements::backend()->getCSS();

        $hasQueuedJobsCSS = false;
        foreach ($css as $file => $attrs) {
            if (strpos($file, 'queuedjobs-admin.css') !== false) {
                $hasQueuedJobsCSS = true;
                break;
            }
        }

        $this->assertTrue(
            $hasQueuedJobsCSS,
            'CSS file should be registered'
        );

        Requirements::clear();
    }

    /**
     * Test that the form receives the required CSS class for JavaScript targeting.
     */
    public function testUpdateEditFormAddsCSSClass()
    {
        $admin = QueuedJobsAdmin::create();
        $form = Form::create($admin, 'TestForm');

        $extension = new QueuedJobsAdminExtension();
        $extension->setOwner($admin);
        $extension->updateEditForm($form);

        $this->assertTrue(
            $form->hasExtraClass('queuedjobs-live-enabled'),
            'Form should have queuedjobs-live-enabled class'
        );
    }

    /**
     * Test that updateEditForm returns a Form instance.
     */
    public function testUpdateEditFormReturnsForm()
    {
        $admin = QueuedJobsAdmin::create();
        $form = Form::create($admin, 'TestForm');

        $extension = new QueuedJobsAdminExtension();
        $extension->setOwner($admin);
        $result = $extension->updateEditForm($form);

        $this->assertInstanceOf(
            Form::class,
            $result,
            'updateEditForm should return a Form instance'
        );
    }
}
