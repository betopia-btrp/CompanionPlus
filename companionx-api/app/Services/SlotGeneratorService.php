<?php

namespace App\Services;

use App\Models\AvailabilitySlot;
use App\Models\AvailabilityTemplate;
use App\Models\ConsultantProfile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class SlotGeneratorService
{
    private const SLOT_DURATION_MINUTES = 30;
    private const WEEKS_AHEAD = 4;

    public function generateFromTemplates(ConsultantProfile $profile, int $weeksAhead = self::WEEKS_AHEAD): void
    {
        $templates = AvailabilityTemplate::where('consultant_id', $profile->user_id)->get();

        if ($templates->isEmpty()) {
            return;
        }

        $startDate = Carbon::today();
        $endDate = Carbon::today()->addWeeks($weeksAhead);

        $slotsToCreate = [];

        foreach ($templates as $template) {
            $current = $startDate->copy();

            while ($current->lte($endDate)) {
                if ($current->dayOfWeek === $template->day_of_week) {
                    $daySlots = $this->splitIntoSlots(
                        $profile->user_id,
                        $template->id,
                        $current,
                        $template->start_time,
                        $template->end_time
                    );
                    $slotsToCreate = array_merge($slotsToCreate, $daySlots);
                }
                $current->addDay();
            }
        }

        if (empty($slotsToCreate)) {
            return;
        }

        DB::transaction(function () use ($slotsToCreate) {
            foreach (array_chunk($slotsToCreate, 200) as $chunk) {
                foreach ($chunk as $slotData) {
                    AvailabilitySlot::updateOrCreate(
                        [
                            'consultant_id' => $slotData['consultant_id'],
                            'start_datetime' => $slotData['start_datetime'],
                        ],
                        [
                            'end_datetime' => $slotData['end_datetime'],
                            'source_template_id' => $slotData['source_template_id'],
                        ]
                    );
                }
            }
        });
    }

    public function regenerateForTemplate(AvailabilityTemplate $template): void
    {
        // Delete future unbooked slots generated from this template
        AvailabilitySlot::where('source_template_id', $template->id)
            ->where('start_datetime', '>', now())
            ->whereDoesntHave('bookings', fn ($q) => $q->whereIn('status', ['booked', 'pending', 'confirmed']))
            ->delete();

        // Regenerate
        $profile = $template->consultant;
        if ($profile) {
            $this->generateFromTemplates($profile);
        }
    }

    public function generateForAllConsultants(int $weeksAhead = self::WEEKS_AHEAD): int
    {
        $profiles = ConsultantProfile::whereHas('availabilityTemplates')->get();
        $count = 0;

        foreach ($profiles as $profile) {
            $this->generateFromTemplates($profile, $weeksAhead);
            $count++;
        }

        return $count;
    }

    private function splitIntoSlots(int $consultantId, int $templateId, Carbon $date, $startTime, $endTime): array
    {
        $start = $date->copy()->setTimeFromTimeString(
            is_string($startTime) ? $startTime : $startTime->format('H:i:s')
        );
        $end = $date->copy()->setTimeFromTimeString(
            is_string($endTime) ? $endTime : $endTime->format('H:i:s')
        );

        // Just create one slot for the entire block, not 30-min chunks
        return [[
            'consultant_id' => $consultantId,
            'source_template_id' => $templateId,
            'start_datetime' => $start,
            'end_datetime' => $end,
        ]];
    }
}
