<?php

namespace App\Services;

use App\Models\AvailabilityOverride;
use App\Models\AvailabilityTemplate;
use App\Models\Booking;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class AvailabilityService
{
    public function computeWindows(int $consultantId, Carbon $start, Carbon $end): array
    {
        $templates = AvailabilityTemplate::where('consultant_id', $consultantId)->get();
        $overrides = AvailabilityOverride::where('consultant_id', $consultantId)
            ->whereBetween('start_datetime', [$start, $end])->get();
        $bookings = Booking::where('consultant_id', $consultantId)
            ->whereIn('status', ['booked', 'confirmed'])
            ->whereBetween('scheduled_start', [$start, $end])->get();

        $windows = [];

        $current = $start->copy()->startOfDay();
        while ($current->lte($end)) {
            $dayTemplates = $templates->where('day_of_week', $current->dayOfWeek);

            foreach ($dayTemplates as $tpl) {
                $tplStart = $this->templateTimeForDate($tpl, $current, 'start_time');
                $tplEnd = $this->templateTimeForDate($tpl, $current, 'end_time');

                $subs = $this->subtractOccupied($tplStart, $tplEnd, $bookings, $overrides);
                foreach ($subs as $r) {
                    $windows[] = [
                        'start_datetime' => $r['start']->toISOString(),
                        'end_datetime' => $r['end']->toISOString(),
                    ];
                }
            }

            foreach ($overrides->where('type', 'available') as $o) {
                if ($o->start_datetime->toDateString() !== $current->toDateString()) {
                    continue;
                }

                $coveredByTemplate = false;
                foreach ($dayTemplates as $tpl) {
                    $tplStart = $this->templateTimeForDate($tpl, $current, 'start_time');
                    $tplEnd = $this->templateTimeForDate($tpl, $current, 'end_time');
                    if ($o->start_datetime->gte($tplStart) && $o->end_datetime->lte($tplEnd)) {
                        $coveredByTemplate = true;
                        break;
                    }
                }

                if ($coveredByTemplate) {
                    $overlapsBlocked = $overrides->where('type', 'blocked')->contains(fn ($blocked) =>
                        $o->start_datetime->lt($blocked->end_datetime) && $o->end_datetime->gt($blocked->start_datetime)
                    );
                    if ($overlapsBlocked) {
                        $subs = $this->subtractOccupied($o->start_datetime, $o->end_datetime, $bookings, collect());
                        foreach ($subs as $r) {
                            $windows[] = [
                                'start_datetime' => $r['start']->toISOString(),
                                'end_datetime' => $r['end']->toISOString(),
                            ];
                        }
                    }
                    continue;
                }

                $subs = $this->subtractOccupied($o->start_datetime, $o->end_datetime, $bookings, $overrides);
                foreach ($subs as $r) {
                    $windows[] = [
                        'start_datetime' => $r['start']->toISOString(),
                        'end_datetime' => $r['end']->toISOString(),
                    ];
                }
            }

            $current->addDay();
        }

        usort($windows, fn ($a, $b) => $a['start_datetime'] <=> $b['start_datetime']);

        $now = now()->toISOString();
        $windows = array_values(array_filter($windows, fn ($w) => $w['end_datetime'] > $now));

        $merged = [];
        foreach ($windows as $w) {
            if (empty($merged)) {
                $merged[] = $w;
            } else {
                $last = &$merged[count($merged) - 1];
                if ($w['start_datetime'] <= $last['end_datetime']) {
                    if ($w['end_datetime'] > $last['end_datetime']) {
                        $last['end_datetime'] = $w['end_datetime'];
                    }
                } else {
                    $merged[] = $w;
                }
            }
        }
        return $merged;
    }

    public function isTimeAvailable(int $consultantId, Carbon $start, Carbon $end): bool
    {
        $dayStart = $start->copy()->startOfDay();
        $dayEnd = $start->copy()->endOfDay();
        $windows = $this->computeWindows($consultantId, $dayStart, $dayEnd);

        foreach ($windows as $w) {
            $windowStart = Carbon::parse($w['start_datetime']);
            $windowEnd = Carbon::parse($w['end_datetime']);
            if ($start->gte($windowStart) && $end->lte($windowEnd)) {
                return true;
            }
        }
        return false;
    }

    private function subtractOccupied(Carbon $rangeStart, Carbon $rangeEnd, Collection $bookings, Collection $overrides): array
    {
        $occupied = collect();

        foreach ($bookings as $b) {
            if ($b->scheduled_start->lt($rangeEnd) && $b->scheduled_end->gt($rangeStart)) {
                $occupied->push([
                    'start' => $b->scheduled_start->gt($rangeStart) ? $b->scheduled_start : $rangeStart,
                    'end' => $b->scheduled_end->lt($rangeEnd) ? $b->scheduled_end : $rangeEnd,
                ]);
            }
        }

        foreach ($overrides->where('type', 'blocked') as $o) {
            if ($o->start_datetime->lt($rangeEnd) && $o->end_datetime->gt($rangeStart)) {
                $occupied->push([
                    'start' => $o->start_datetime->gt($rangeStart) ? $o->start_datetime : $rangeStart,
                    'end' => $o->end_datetime->lt($rangeEnd) ? $o->end_datetime : $rangeEnd,
                ]);
            }
        }

        if ($occupied->isEmpty()) {
            return [['start' => $rangeStart, 'end' => $rangeEnd]];
        }

        $sorted = $occupied->sortBy(fn ($s) => $s['start']->timestamp)->values();
        $merged = [$sorted[0]];
        for ($i = 1; $i < count($sorted); $i++) {
            $last = &$merged[count($merged) - 1];
            if ($sorted[$i]['start']->lte($last['end'])) {
                $last['end'] = $sorted[$i]['end']->gt($last['end']) ? $sorted[$i]['end'] : $last['end'];
            } else {
                $merged[] = $sorted[$i];
            }
        }

        $result = [];
        $cursor = $rangeStart->copy();
        foreach ($merged as $seg) {
            if ($seg['start']->gt($cursor)) {
                $result[] = ['start' => $cursor->copy(), 'end' => $seg['start']->copy()];
            }
            if ($seg['end']->gt($cursor)) {
                $cursor = $seg['end']->copy();
            }
        }
        if ($cursor->lt($rangeEnd)) {
            $result[] = ['start' => $cursor->copy(), 'end' => $rangeEnd->copy()];
        }

        return $result;
    }

    private function templateTimeForDate($tpl, Carbon $date, string $field): Carbon
    {
        $time = $tpl->$field instanceof Carbon ? $tpl->$field->format('H:i') : (string) $tpl->$field;
        return Carbon::parse($date->format('Y-m-d') . ' ' . $time, 'UTC');
    }
}
