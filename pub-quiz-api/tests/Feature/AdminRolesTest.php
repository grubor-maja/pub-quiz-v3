<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Organization;
use App\Models\Quiz;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminRolesTest extends TestCase
{
    use RefreshDatabase;

    private Organization $mine;
    private Organization $other;
    private Quiz $myQuiz;
    private Quiz $otherQuiz;

    protected function setUp(): void
    {
        parent::setUp();

        $this->mine = Organization::create(['name' => 'Moja', 'slug' => 'moja', 'dragon_color' => 'lime']);
        $this->other = Organization::create(['name' => 'Tuđa', 'slug' => 'tudja', 'dragon_color' => 'koral']);
        $this->myQuiz = $this->quiz($this->mine, 'Moj kviz');
        $this->otherQuiz = $this->quiz($this->other, 'Tuđi kviz');
    }

    private function quiz(Organization $org, string $title): Quiz
    {
        return Quiz::create([
            'organization_id' => $org->id,
            'title' => $title,
            'slug' => \Illuminate\Support\Str::slug($title),
            'quiz_date' => now()->addWeek()->toDateString(),
            'status' => 'published',
        ]);
    }

    private function orgAdmin(): User
    {
        $user = User::factory()->create();
        $user->managedOrganizations()->attach($this->mine->id);

        return $user;
    }

    private function siteAdmin(): User
    {
        $user = User::factory()->create();
        $user->is_admin = true;
        $user->save();

        return $user;
    }

    public function test_ordinary_user_gets_404_everywhere_in_admin(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/admin/quizzes')->assertNotFound();
        $this->getJson('/api/admin/organizations')->assertNotFound();
        $this->getJson('/api/admin/users')->assertNotFound();
        $this->getJson('/api/admin/audit')->assertNotFound();
    }

    public function test_org_admin_sees_only_their_quizzes_and_organizations(): void
    {
        Sanctum::actingAs($this->orgAdmin());

        $this->getJson('/api/admin/quizzes')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $this->myQuiz->id);

        $this->getJson('/api/admin/organizations')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $this->mine->id);
    }

    public function test_org_admin_cannot_touch_another_organizations_quiz(): void
    {
        Sanctum::actingAs($this->orgAdmin());

        $this->getJson("/api/admin/quizzes/{$this->otherQuiz->id}")->assertNotFound();
        $this->putJson("/api/admin/quizzes/{$this->otherQuiz->id}", ['title' => 'X'])->assertNotFound();
        $this->deleteJson("/api/admin/quizzes/{$this->otherQuiz->id}")->assertNotFound();

        $this->postJson('/api/admin/quizzes', [
            'organization_id' => $this->other->id, 'title' => 'Podmetnut',
        ])->assertUnprocessable();

        // Nor move their own quiz into an organization they do not run.
        $this->putJson("/api/admin/quizzes/{$this->myQuiz->id}", ['organization_id' => $this->other->id])
            ->assertUnprocessable();

        $this->assertDatabaseHas('quizzes', ['id' => $this->otherQuiz->id, 'title' => 'Tuđi kviz']);
        $this->assertDatabaseHas('quizzes', ['id' => $this->myQuiz->id, 'organization_id' => $this->mine->id]);
    }

    public function test_org_admin_manages_own_quizzes_and_every_change_is_logged(): void
    {
        $user = $this->orgAdmin();
        Sanctum::actingAs($user);

        $this->postJson('/api/admin/quizzes', ['organization_id' => $this->mine->id, 'title' => 'Novi kviz'])
            ->assertCreated();
        $this->putJson("/api/admin/quizzes/{$this->myQuiz->id}", ['title' => 'Preimenovan'])->assertOk();
        $this->deleteJson("/api/admin/quizzes/{$this->myQuiz->id}")->assertOk();

        $this->assertSame(
            ['quiz.created', 'quiz.updated', 'quiz.deleted'],
            AuditLog::orderBy('id')->pluck('action')->all()
        );
        $update = AuditLog::where('action', 'quiz.updated')->first();
        $this->assertSame($user->id, $update->user_id);
        $this->assertSame(['old' => 'Moj kviz', 'new' => 'Preimenovan'], $update->changes['title']);
    }

    public function test_org_admin_can_edit_but_not_delete_or_create_organizations(): void
    {
        Sanctum::actingAs($this->orgAdmin());

        $this->putJson("/api/admin/organizations/{$this->mine->id}", [
            'description' => 'Novi opis', 'slug' => 'oteto', 'instagram_handle' => 'oteto',
        ])->assertOk();
        $this->assertDatabaseHas('organizations', [
            'id' => $this->mine->id, 'description' => 'Novi opis', 'slug' => 'moja', 'instagram_handle' => null,
        ]);

        $this->putJson("/api/admin/organizations/{$this->other->id}", ['description' => 'X'])->assertNotFound();
        $this->deleteJson("/api/admin/organizations/{$this->mine->id}")->assertNotFound();
        $this->postJson('/api/admin/organizations', ['name' => 'Nova'])->assertNotFound();
        $this->getJson('/api/admin/users')->assertNotFound();
        $this->getJson('/api/admin/audit')->assertNotFound();
    }

    public function test_site_admin_assigns_organizations_and_it_is_logged(): void
    {
        $target = User::factory()->create();
        Sanctum::actingAs($this->siteAdmin());

        $this->putJson("/api/admin/users/{$target->id}/organizations", [
            'organization_ids' => [$this->mine->id, $this->other->id],
        ])->assertOk()->assertJsonCount(2, 'managed_organizations');

        $this->getJson('/api/admin/users?search=' . urlencode($target->email))
            ->assertOk()
            ->assertJsonPath('data.0.managed_organizations.0.name', 'Moja');

        $log = AuditLog::where('action', 'user.roles_changed')->sole();
        $this->assertSame(['Moja', 'Tuđa'], $log->changes['dodato']);
    }

    public function test_site_admin_can_restore_a_deleted_quiz_from_the_audit_log(): void
    {
        Sanctum::actingAs($this->siteAdmin());
        $this->deleteJson("/api/admin/quizzes/{$this->myQuiz->id}")->assertOk();
        $log = AuditLog::where('action', 'quiz.deleted')->sole();

        $this->getJson('/api/admin/audit')->assertOk()->assertJsonPath('data.0.restorable', true);
        $this->postJson("/api/admin/audit/{$log->id}/restore")->assertOk();

        $this->assertDatabaseHas('quizzes', ['id' => $this->myQuiz->id, 'title' => 'Moj kviz', 'slug' => 'moj-kviz']);
        $this->postJson("/api/admin/audit/{$log->id}/restore")->assertUnprocessable();
    }

    public function test_me_reports_managed_organizations(): void
    {
        Sanctum::actingAs($this->orgAdmin());

        $this->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.is_admin', false)
            ->assertJsonPath('user.managed_organizations.0.slug', 'moja');
    }

    public function test_sync_endpoint_refuses_when_no_key_is_configured(): void
    {
        config(['services.sync_api_key' => '']);

        $this->postJson('/api/instagram/sync')->assertUnauthorized();
        $this->postJson('/api/instagram/sync', [], ['X-Api-Key' => ''])->assertUnauthorized();
    }
}
