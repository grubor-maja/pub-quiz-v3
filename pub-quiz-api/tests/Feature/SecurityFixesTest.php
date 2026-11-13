<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\Quiz;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** One test per finding from the QA security pass of 14.11.2026. */
class SecurityFixesTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;

    protected function setUp(): void
    {
        parent::setUp();
        $this->org = Organization::create(['name' => 'Org', 'slug' => 'org', 'dragon_color' => 'lime']);
    }

    private function admin(): User
    {
        $u = User::factory()->create();
        $u->is_admin = true;
        $u->save();
        Sanctum::actingAs($u);

        return $u;
    }

    private function quiz(array $attrs = []): Quiz
    {
        return Quiz::create(array_merge([
            'organization_id' => $this->org->id, 'title' => 'Hari Poter', 'slug' => 'hari-poter',
            'quiz_date' => now()->addWeek()->toDateString(), 'status' => 'published',
        ], $attrs));
    }

    public function test_array_filters_are_rejected_with_422_not_500(): void
    {
        $this->getJson('/api/quizzes?org[]=x')->assertUnprocessable();
        $this->getJson('/api/quizzes?search[]=x')->assertUnprocessable();
        $this->getJson('/api/quizzes/map?org[]=x')->assertUnprocessable();
    }

    public function test_like_wildcards_match_literally(): void
    {
        $this->quiz();

        $this->getJson('/api/quizzes?search=%25')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/quizzes?search=_')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/quizzes?search=Poter')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_security_headers_are_sent(): void
    {
        $this->getJson('/api/quizzes')
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeaderMissing('X-Powered-By');

        $csp = $this->get('/')->headers->get('Content-Security-Policy');
        $this->assertStringContainsString("script-src 'self'", (string) $csp);
        $this->assertStringContainsString("frame-ancestors 'none'", (string) $csp);
    }

    public function test_common_passwords_are_refused(): void
    {
        foreach (['12345678', 'password', 'aaaaaaaa'] as $weak) {
            $this->postJson('/api/auth/register', [
                'name' => 'X', 'email' => "w{$weak}@example.test",
                'password' => $weak, 'password_confirmation' => $weak,
            ])->assertUnprocessable()->assertJsonValidationErrors('password');
        }

        $this->postJson('/api/auth/register', [
            'name' => 'X', 'email' => 'ok@example.test',
            'password' => 'zmaj-na-kvizu-7', 'password_confirmation' => 'zmaj-na-kvizu-7',
        ])->assertCreated();
    }

    public function test_published_quiz_needs_a_date_but_a_draft_does_not(): void
    {
        $this->admin();

        $this->postJson('/api/admin/quizzes', ['organization_id' => $this->org->id, 'title' => 'Bez datuma'])
            ->assertUnprocessable()->assertJsonValidationErrors('quiz_date');

        $this->postJson('/api/admin/quizzes', ['organization_id' => $this->org->id, 'title' => 'Nacrt', 'status' => 'draft'])
            ->assertCreated();

        $quiz = $this->quiz();
        $this->putJson("/api/admin/quizzes/{$quiz->id}", ['quiz_date' => null])
            ->assertUnprocessable()->assertJsonValidationErrors('quiz_date');
    }

    public function test_renaming_a_quiz_keeps_its_url(): void
    {
        $this->admin();
        $quiz = $this->quiz();

        $this->putJson("/api/admin/quizzes/{$quiz->id}", ['title' => 'Hari Poter i Red feniksa'])->assertOk();

        $this->getJson('/api/quizzes/hari-poter')->assertOk()->assertJsonPath('title', 'Hari Poter i Red feniksa');
    }

    public function test_script_urls_are_refused(): void
    {
        $this->admin();
        $quiz = $this->quiz();

        foreach (['javascript:alert(1)', 'data:text/html,x', '//evil.example/x.png'] as $bad) {
            $this->putJson("/api/admin/quizzes/{$quiz->id}", ['cover_image_url' => $bad])
                ->assertUnprocessable()->assertJsonValidationErrors('cover_image_url');
            $this->putJson("/api/admin/quizzes/{$quiz->id}", ['instagram_post_url' => $bad])
                ->assertUnprocessable()->assertJsonValidationErrors('instagram_post_url');
            $this->putJson("/api/admin/organizations/{$this->org->id}", ['logo_url' => $bad])
                ->assertUnprocessable()->assertJsonValidationErrors('logo_url');
        }

        $this->putJson("/api/admin/quizzes/{$quiz->id}", [
            'cover_image_url' => 'https://scontent.cdninstagram.com/a.jpg',
            'instagram_post_url' => 'https://www.instagram.com/p/abc/',
        ])->assertOk();
        $this->putJson("/api/admin/organizations/{$this->org->id}", ['logo_url' => '/images/logo.jpg'])->assertOk();
    }

    public function test_every_api_404_looks_the_same(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $missingRoute = $this->getJson('/api/does-not-exist')->assertNotFound()->json();
        $missingQuiz = $this->getJson('/api/quizzes/nema-ga')->assertNotFound()->json();
        $hiddenAdmin = $this->getJson('/api/admin/users')->assertNotFound()->json();

        $this->assertSame($missingRoute, $missingQuiz);
        $this->assertSame($missingRoute, $hiddenAdmin);
        $this->assertStringNotContainsString('App\\Models', json_encode($missingQuiz));
    }
}
