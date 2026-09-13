<?php

namespace App\Console\Commands;

use App\Models\Organization;
use App\Services\ApifyService;
use Illuminate\Console\Command;

/**
 * Fetches a couple of posts and shows what came back, so a different actor can
 * be checked for a fraction of a cent before it is trusted with the daily sync.
 *
 * Actors do not document their output shape reliably, and a wrong field mapping
 * fails silently: the sync reports success and simply creates nothing.
 */
class InstagramTestActor extends Command
{
    protected $signature = 'instagram:test-actor
                            {--org= : Organization slug to sample (default: first one)}
                            {--actor= : Actor id to try instead of the configured one}
                            {--limit=3 : How many posts to fetch}';

    protected $description = 'Fetch a few posts and report whether the fields we rely on came through';

    public function handle(): int
    {
        if ($actor = $this->option('actor')) {
            config(['services.apify.actor_id' => $actor]);
        }

        $org = $this->option('org')
            ? Organization::where('slug', $this->option('org'))->first()
            : Organization::whereNotNull('instagram_handle')->first();

        if (!$org) {
            $this->error('No organization found.');

            return 1;
        }

        $limit = (int) $this->option('limit');
        $this->info("Actor:  " . config('services.apify.actor_id'));
        $this->info("Handle: @{$org->instagram_handle}  ({$limit} posts)");
        $this->newLine();

        $posts = app(ApifyService::class)->fetchPostsForHandle($org->instagram_handle, $limit);

        if ($posts === []) {
            $this->error('No posts returned. Check storage/logs/laravel.log - a 402 there means the free credit is spent.');

            return 1;
        }

        $this->info('Got ' . count($posts) . " post(s).");
        $this->newLine();

        // These are exactly the fields SyncInstagramPosts reads. Anything
        // missing here means the sync would quietly produce nothing.
        $required = ['id', 'shortCode', 'url', 'caption', 'displayUrl', 'ownerUsername', 'timestamp'];
        $first = $posts[0];
        $missing = [];

        foreach ($required as $field) {
            $value = $first[$field] ?? null;
            if ($value === null || $value === '') {
                $missing[] = $field;
                $this->line(sprintf('  %-16s <fg=red>MISSING</>', $field));
            } else {
                $shown = is_scalar($value) ? mb_substr((string) $value, 0, 54) : gettype($value);
                $this->line(sprintf('  %-16s %s', $field, str_replace("\n", ' ', $shown)));
            }
        }

        $this->newLine();
        $this->line('Raw keys the actor returned:');
        $this->line('  ' . implode(', ', array_slice(array_keys($first), 0, 25)));
        $this->newLine();

        if ($missing !== []) {
            $this->error('Missing: ' . implode(', ', $missing)
                . ' - add the actor\'s names for these to ApifyService::OUTPUT_ALIASES before switching.');

            return 1;
        }

        $this->info('All required fields present. This actor is safe to switch to.');

        return 0;
    }
}
