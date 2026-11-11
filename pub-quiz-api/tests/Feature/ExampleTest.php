<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Smoke test that gates every deploy: all migrations run on an empty
 * database, and the public endpoints the site depends on answer.
 */
class ExampleTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_api_endpoints_respond(): void
    {
        $this->getJson('/api/quizzes')->assertOk();
        $this->getJson('/api/organizations')->assertOk();
    }

    public function test_sitemap_and_robots_respond(): void
    {
        $this->get('/sitemap.xml')->assertOk();
        $this->get('/robots.txt')->assertOk();
    }
}
