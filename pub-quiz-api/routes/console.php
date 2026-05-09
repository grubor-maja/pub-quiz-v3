<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('instagram:sync')->dailyAt('07:00');
