<?php

namespace App\Console\Commands;

use App\Jobs\SyncInstagramPosts;
use Illuminate\Console\Command;

class InstagramSync extends Command
{
    protected $signature = 'instagram:sync {--org= : Limit the sync to one organization slug}';
    protected $description = 'Sync quiz posts from Instagram via Apify';

    public function handle(): int
    {
        $orgSlug = $this->option('org');

        $this->info('Starting Instagram sync' . ($orgSlug ? " for {$orgSlug}" : '') . '...');
        dispatch_sync(new SyncInstagramPosts($orgSlug));
        $this->info('Done.');

        return 0;
    }
}
