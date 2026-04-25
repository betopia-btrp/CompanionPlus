<?php

namespace Database\Seeders;

use App\Models\AvailabilitySlot;
use App\Models\ConsultantProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;

class ConsultantAvailabilitySeeder extends Seeder
{
    public function run(): void
    {
        $demoUser = User::updateOrCreate(
            ['email' => 'demo.consultant@companionx.com'],
            [
                'first_name' => 'Demo',
                'last_name' => 'Consultant',
                'phone' => '01900000099',
                'password' => Hash::make('DemoPass123!'),
                'dob' => '1990-01-01',
                'gender' => 'other',
                'guardian_contact' => null,
                'system_role' => 'consultant',
            ]
        );

        $demoProfile = ConsultantProfile::updateOrCreate(
            ['user_id' => $demoUser->id],
            [
                'specialization' => 'Clinical Psychologist',
                'bio' => 'Focused on anxiety, stress, and guided coping strategies.',
                'base_rate_bdt' => 1800,
                'is_approved' => true,
                'average_rating' => 4.9,
            ]
        );

        $this->seedSlotsForProfile($demoProfile, [
            [1, 10, 11],
            [1, 14, 15],
            [2, 11, 12],
        ]);

        ConsultantProfile::where('is_approved', true)
            ->where('user_id', '!=', $demoProfile->user_id)
            ->orderBy('user_id')
            ->take(3)
            ->get()
            ->each(function (ConsultantProfile $profile, int $index) {
                $this->seedSlotsForProfile($profile, [
                    [1, 9 + $index, 10 + $index],
                    [2, 13 + $index, 14 + $index],
                ]);
            });
    }

    private function seedSlotsForProfile(ConsultantProfile $profile, array $slotDefinitions): void
    {
        foreach ($slotDefinitions as [$daysFromNow, $startHour, $endHour]) {
            $start = Carbon::now()->addDays($daysFromNow)->setTime($startHour, 0, 0);
            $end = Carbon::now()->addDays($daysFromNow)->setTime($endHour, 0, 0);

            AvailabilitySlot::updateOrCreate(
                [
                    'consultant_id' => $profile->user_id,
                    'start_datetime' => $start,
                ],
                [
                    'end_datetime' => $end,
                ]
            );
        }
    }
}
