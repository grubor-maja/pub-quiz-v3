<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

/**
 * Grants or revokes admin rights.
 *
 * Deliberately a console command rather than anything reachable over HTTP:
 * running it requires access to the server, which is a far better gate than
 * any check the application could make about who is allowed to promote whom.
 */
class MakeUserAdmin extends Command
{
    protected $signature = 'user:make-admin
                            {email : Email of an existing, registered user}
                            {--revoke : Take admin rights away instead}';

    protected $description = 'Grant or revoke admin rights for a registered user';

    public function handle(): int
    {
        $email = $this->argument('email');
        $revoke = (bool) $this->option('revoke');

        $user = User::where('email', $email)->first();

        if (!$user) {
            $this->error("No user with email {$email}.");

            $known = User::orderBy('email')->pluck('email');
            if ($known->isEmpty()) {
                $this->line('No users are registered yet. Sign up on the site first, then run this again.');
            } else {
                $this->line('Registered: ' . $known->implode(', '));
            }

            return 1;
        }

        if ($user->is_admin === !$revoke) {
            $this->info("{$email} is already " . ($revoke ? 'not an admin' : 'an admin') . '.');

            return 0;
        }

        $user->is_admin = !$revoke;
        $user->save();

        // Existing tokens keep working and pick up the new rights on their next
        // request, since authorization is read from the user, not the token.
        $this->info($revoke
            ? "Revoked admin from {$email}."
            : "{$email} is now an admin.");

        return 0;
    }
}
