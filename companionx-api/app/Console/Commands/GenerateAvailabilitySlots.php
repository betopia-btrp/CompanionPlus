<?php

namespace App\Console\Commands;

use App\Services\SlotGeneratorService;
use Illuminate\Console\Command;

class GenerateAvailabilitySlots extends Command
{
    protected $signature = 'slots:generate {--weeks=4 : Number of weeks ahead to generate}';
    protected $description = 'Generate concrete availability slots from templates for all consultants';

    public function handle(SlotGeneratorService $service): int
    {
        $weeks = (int) $this->option('weeks');
        $count = $service->generateForAllConsultants($weeks);

        $this->info("Generated slots for {$count} consultant(s), {$weeks} week(s) ahead.");

        return self::SUCCESS;
    }
}
