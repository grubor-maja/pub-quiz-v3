<?php

namespace Database\Seeders;

use App\Models\Organization;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $orgs = [
            [
                'name' => 'Pub Kviz Beograd',
                'slug' => 'pub-kviz-beograd',
                'instagram_handle' => 'pubkviz_beograd',
                'description' => 'Najveci pub kviz u Beogradu. Svake srede i petka.',
            ],
            [
                'name' => 'Quiz Night Serbia',
                'slug' => 'quiz-night-serbia',
                'instagram_handle' => 'quiznight_serbia',
                'description' => 'Kvizovi opste kulture sirom Srbije.',
            ],
            [
                'name' => 'Trivija Klub',
                'slug' => 'trivija-klub',
                'instagram_handle' => 'trivija_klub',
                'description' => 'Zabavni kvizovi sa temama iz filma, muzike i sporta.',
            ],
        ];

        foreach ($orgs as $orgData) {
            $org = Organization::create($orgData);

            $quizzes = [
                [
                    'title' => "Kviz opste kulture - {$org->name}",
                    'slug' => Str::slug("kviz-opste-kulture-{$org->slug}-" . now()->format('Y-m-d')),
                    'quiz_date' => now()->addDays(3)->format('Y-m-d'),
                    'quiz_time' => '20:00',
                    'location' => 'Kafana Kod Mame',
                    'address' => 'Knez Mihailova 10, Beograd',
                    'entry_fee' => 500,
                    'min_team_members' => 2,
                    'max_team_members' => 6,
                    'contact_phone' => '064/123-456',
                    'status' => 'published',
                ],
                [
                    'title' => "Film i muzika kviz - {$org->name}",
                    'slug' => Str::slug("film-muzika-kviz-{$org->slug}-" . now()->addWeek()->format('Y-m-d')),
                    'quiz_date' => now()->addWeek()->format('Y-m-d'),
                    'quiz_time' => '19:30',
                    'location' => 'Pivnica Dva Jelena',
                    'address' => 'Skadarska 32, Beograd',
                    'entry_fee' => 400,
                    'min_team_members' => 1,
                    'max_team_members' => 4,
                    'contact_phone' => '063/987-654',
                    'status' => 'published',
                ],
            ];

            foreach ($quizzes as $quizData) {
                $org->quizzes()->create($quizData);
            }
        }
    }
}
