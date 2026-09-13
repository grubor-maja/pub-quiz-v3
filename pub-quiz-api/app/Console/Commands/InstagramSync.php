<?php

namespace App\Console\Commands;

use App\Jobs\SyncInstagramPosts;
use Illuminate\Console\Command;

class InstagramSync extends Command
{
    protected $signature = 'instagram:sync
                            {--org= : Limit the sync to one organization slug}
                            {--limit= : Posts to fetch per organization (default APIFY_POST_LIMIT)}';

    protected $description = 'Sync quiz posts from Instagram via Apify';

    public function handle(): int
    {
        $orgSlug = $this->option('org');
        $limit = $this->option('limit') !== null ? (int) $this->option('limit') : null;

        $this->info('Starting Instagram sync'
            . ($orgSlug ? " for {$orgSlug}" : '')
            . ($limit ? " ({$limit} posts each)" : '')
            . '...');

        dispatch_sync(new SyncInstagramPosts($orgSlug, $limit));
        $this->info('Done.');

        return 0;
    }
}
