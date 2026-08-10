<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('instagram:sync')->dailyAt('07:00');
Schedule::command('geocode:quizzes')->dailyAt('07:15'); // geocode new quizzes from sync
