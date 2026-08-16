<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('instagram:sync')->dailyAt('07:00');
Schedule::command('geocode:quizzes')->dailyAt('07:15'); // geocode new quizzes from sync
// Sweeps up schedule-only entries left behind by earlier syncs, so a quiz is
// only listed once it has a post of its own.
Schedule::command('quizzes:prune-unannounced')->dailyAt('07:30');
