<?php

namespace Database\Seeders;

use App\Models\Organization;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // default_* columns are fallbacks for the extraction pipeline: they are
        // used only when a caption does not state the value itself. Leave them
        // null for organizations that vary their venue from quiz to quiz.
        $orgs = [
            [
                'name' => 'Pab Kviz Obrati Paznju',
                'slug' => 'pab-kviz-obrati-paznju',
                'instagram_handle' => 'pabkviz_obratipaznju',
                'description' => null,
            ],
            [
                'name' => 'Pab Kviz 8x8',
                'slug' => 'pab-kviz-8x8',
                'instagram_handle' => 'pabkviz8x8',
                'description' => null,
            ],
            [
                'name' => 'Pab Kviz Inkvizitor',
                'slug' => 'pab-kviz-inkvizitor',
                'instagram_handle' => 'pab_kviz_inkvizitor',
                'description' => null,
            ],
            [
                'name' => 'I HATE QUIZ',
                'slug' => 'i-hate-quiz',
                'instagram_handle' => 'pabkviz.rs',
                'logo_url' => '/images/logo-i-hate-quiz.jpg',
                'description' => null,
                // Always hosted in their own club, so these rarely appear in the
                // schedule posts and have to come from here.
                'default_location' => 'PUB QUIZ HOUSE',
                'default_address' => 'Brace Jugovica 16, Beograd',
                'default_quiz_time' => '20:30',
                'default_entry_fee' => 500,
                'default_contact_phone' => '064/66-666-36',
                'default_min_team_members' => 2,
                'default_max_team_members' => 6,
            ],
        ];

        foreach ($orgs as $orgData) {
            Organization::updateOrCreate(['slug' => $orgData['slug']], $orgData);
        }
    }
}
