<?php

namespace Database\Seeders;

use App\Models\ConsultantProfile;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class ConsultantSeeder extends Seeder
{
    public function run(): void
    {
        $freeConsultantPlan = SubscriptionPlan::where('name', 'Free')
            ->where('type', 'consultant')
            ->first();

        $consultants = [
            [
                "name" => "Dr. Ariful Islam",
                "special" => "Clinical Psychologist",
                "bio" => "Expert in CBT and clinical depression.",
            ],
            [
                "name" => "Sabrina Hassan",
                "special" => "Student Counselor",
                "bio" => "Specializes in academic pressure and exam anxiety.",
            ],
            [
                "name" => "Farhan Chowdhury",
                "special" => "Career Coach",
                "bio" =>
                    "Helping young professionals navigate workplace stress.",
            ],
            [
                "name" => "Dr. Nusrat Jahan",
                "special" => "Family Therapist",
                "bio" => "Focuses on relationship issues and family dynamics.",
            ],
            [
                "name" => "Tanvir Ahmed",
                "special" => "Stress Management",
                "bio" => "Uses mindfulness tools to manage daily stress.",
            ],
            [
                "name" => "Laila Rahman",
                "special" => "Trauma Specialist",
                "bio" => "Certified in therapy for emotional recovery.",
            ],
            [
                "name" => "Imtiaz Hossain",
                "special" => "Addiction Counselor",
                "bio" =>
                    "Specialized in habit breaking and behavioral therapy.",
            ],
            [
                "name" => "Sonia Mirza",
                "special" => "Self-Esteem Coach",
                "bio" => "Passionate about helping people build confidence.",
            ],
            [
                "name" => "Dr. Kamal Uddin",
                "special" => "Senior Psychiatrist",
                "bio" => "Holistic approach to mood disorders.",
            ],
            [
                "name" => "Nabila Islam",
                "special" => "Grief Counselor",
                "bio" => "Support for those dealing with loss and grief.",
            ],
        ];

        foreach ($consultants as $index => $c) {
            DB::transaction(function () use ($c, $index, $freeConsultantPlan) {
                $names = explode(" ", $c["name"]);
                $user = User::updateOrCreate(
                    [
                        "email" => "consultant{$index}@gmail.com",
                    ],
                    [
                        "first_name" => $names[0],
                        "last_name" => $names[1] ?? "Consultant",
                        "password" => Hash::make("password123"),
                        "phone" =>
                            "018" . str_pad($index + 1, 8, "0", STR_PAD_LEFT),
                        "dob" => "1985-01-01",
                        "gender" => "other",
                        "system_role" => "consultant",
                        "subscription_plan_id" => $freeConsultantPlan?->id,
                    ],
                );

                ConsultantProfile::updateOrCreate(
                    [
                        "user_id" => $user->id,
                    ],
                    [
                        "specialization" => $c["special"],
                        "bio" => $c["bio"],
                        "base_rate_bdt" => rand(800, 2000),
                        "is_approved" => true,
                    ],
                );

                if ($freeConsultantPlan && !$user->subscriptions()->where('status', 'active')->exists()) {
                    $user->subscriptions()->create([
                        'subscription_plan_id' => $freeConsultantPlan->id,
                        'status' => 'active',
                        'current_period_start' => now(),
                        'free_sessions_remaining' => $freeConsultantPlan->getFeature('free_sessions', 0),
                    ]);
                }
            });
        }
    }
}
