<?php

namespace Tests\Feature;

use App\Console\Commands\GeocodeQuizzes;
use App\Models\Organization;
use App\Models\Quiz;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/** Findings from the QA pass of 14.11.2026: time zone, "Besplatno", city. */
class QaRoundThreeTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;

    protected function setUp(): void
    {
        parent::setUp();
        $this->org = Organization::create(['name' => 'Pab Kviz Test', 'slug' => 'test', 'dragon_color' => 'lime']);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    private function quiz(string $date, array $attrs = []): Quiz
    {
        $quiz = new Quiz;
        // forceFill: the coordinates are set by the geocoder, not mass assignable.
        $quiz->forceFill(array_merge([
            'organization_id' => $this->org->id, 'title' => "Kviz {$date}", 'slug' => "kviz-{$date}",
            'quiz_date' => $date, 'status' => 'published', 'latitude' => 44.81, 'longitude' => 20.46,
        ], $attrs))->save();

        return $quiz;
    }

    public function test_after_midnight_in_belgrade_yesterdays_quiz_is_past_on_list_and_map(): void
    {
        // 00:30 on 14.11 in Belgrade is still 23:30 on 13.11 in UTC.
        $now = CarbonImmutable::parse('2026-11-13 23:30:00', 'UTC');
        Carbon::setTestNow($now);
        CarbonImmutable::setTestNow($now);

        $this->quiz('2026-11-13');
        $this->quiz('2026-11-14');

        $this->getJson('/api/quizzes')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.quiz_date', fn ($d) => str_starts_with($d, '2026-11-14'));
        $this->getJson('/api/quizzes/map')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/quizzes?archive=1')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_server_rendered_pages_do_not_call_an_unstated_fee_free(): void
    {
        // The page shell normally comes from the frontend container.
        Http::fake(['*' => Http::response('<!doctype html><html><head><title>x</title></head><body><div id="root"></div></body></html>')]);
        $this->quiz(now()->addDays(3)->toDateString(), ['title' => 'Hitovi 21. veka', 'slug' => 'hitovi', 'entry_fee' => null]);
        $this->quiz(now()->addDays(4)->toDateString(), ['title' => 'Plaćeni', 'slug' => 'placeni', 'entry_fee' => 400]);

        $home = $this->get('/')->assertOk()->getContent();
        $this->assertStringNotContainsString('Besplatno', $home);
        $this->assertStringContainsString('400 din', $home);

        $this->assertStringNotContainsString('Besplatno', $this->get('/kvizovi/hitovi')->getContent());
    }

    public function test_city_is_read_from_nominatims_serbian_address_shapes(): void
    {
        // Real responses for Belgrade, Novi Sad and Nis venues.
        $this->assertSame('Beograd', GeocodeQuizzes::cityFrom(['city' => 'Gradska opština Stari grad', 'county' => 'Grad Beograd']));
        $this->assertSame('Beograd', GeocodeQuizzes::cityFrom(['city' => 'Beograd', 'county' => 'Grad Beograd']));
        $this->assertSame('Novi Sad', GeocodeQuizzes::cityFrom(['municipality' => 'Grad Novi Sad', 'county' => 'Južnobački upravni okrug']));
        $this->assertSame('Niš', GeocodeQuizzes::cityFrom(['municipality' => 'Grad Niš', 'county' => 'Nišavski upravni okrug']));
        $this->assertSame('Inđija', GeocodeQuizzes::cityFrom(['town' => 'Inđija', 'municipality' => 'Opština Inđija']));
        $this->assertNull(GeocodeQuizzes::cityFrom([]));
    }

    public function test_city_is_in_the_api_and_editable_by_an_admin(): void
    {
        $quiz = $this->quiz(now()->addDays(2)->toDateString(), ['city' => 'Novi Sad']);

        $this->getJson("/api/quizzes/{$quiz->slug}")->assertJsonPath('city', 'Novi Sad');
        $this->getJson('/api/quizzes/map')->assertJsonPath('data.0.city', 'Novi Sad');

        $admin = \App\Models\User::factory()->create();
        $admin->is_admin = true;
        $admin->save();
        \Laravel\Sanctum\Sanctum::actingAs($admin);
        $this->putJson("/api/admin/quizzes/{$quiz->id}", ['city' => 'Sremski Karlovci'])->assertOk();
        $this->assertDatabaseHas('quizzes', ['id' => $quiz->id, 'city' => 'Sremski Karlovci']);
    }

    public function test_calendar_file_has_no_invented_end_or_start_time(): void
    {
        $this->quiz('2026-12-03', ['slug' => 'sa-vremenom', 'quiz_time' => '19:45:00']);
        $this->quiz('2026-12-04', ['slug' => 'bez-vremena', 'quiz_time' => null]);

        $ics = $this->get('/api/quizzes/sa-vremenom/calendar.ics')->assertOk()->getContent();
        $this->assertStringContainsString('DTSTART;TZID=Europe/Belgrade:20261203T194500', $ics);
        $this->assertStringNotContainsString('DTEND', $ics);

        $ics = $this->get('/api/quizzes/bez-vremena/calendar.ics')->assertOk()->getContent();
        $this->assertStringContainsString('DTSTART;VALUE=DATE:20261204', $ics);
        $this->assertStringNotContainsString('190000', $ics);
        $this->assertStringNotContainsString('DTEND', $ics);
    }
}
