<?php

namespace Database\Seeders;

use App\Models\Organization;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
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
        ];

        foreach ($orgs as $orgData) {
            Organization::create($orgData);
        }
    }
}
