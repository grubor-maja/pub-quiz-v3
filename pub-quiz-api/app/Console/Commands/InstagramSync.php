<?php

namespace App\Console\Commands;

use App\Jobs\SyncInstagramPosts;
use Illuminate\Console\Command;

class InstagramSync extends Command
{
    protected $signature = 'instagram:sync';
    protected $description = 'Sync quiz posts from Instagram via Apify';

    public function handle(): int
    {
        $this->info('Starting Instagram sync...');
        dispatch_sync(new SyncInstagramPosts());
        $this->info('Done.');
        return 0;
    }
}
