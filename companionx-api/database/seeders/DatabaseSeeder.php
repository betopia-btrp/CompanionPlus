<?php

namespace Database\Seeders;

use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $freePatientPlan = SubscriptionPlan::where('name', 'Free')
            ->where('type', 'patient')
            ->first();

        $user = User::updateOrCreate(
            ['email' => 'test@example.com'],
            [
                'first_name' => 'Test',
                'last_name' => 'User',
                'phone' => '01700000000',
                'password' => Hash::make('password'),
                'dob' => '2000-01-01',
                'gender' => 'other',
                'guardian_contact' => null,
                'system_role' => 'patient',
                'subscription_plan_id' => $freePatientPlan?->id,
            ]
        );

        if ($freePatientPlan && !$user->subscriptions()->where('status', 'active')->exists()) {
            $user->subscriptions()->create([
                'subscription_plan_id' => $freePatientPlan->id,
                'status' => 'active',
                'current_period_start' => now(),
                'free_sessions_remaining' => $freePatientPlan->getFeature('free_sessions', 0),
            ]);
        }

        $this->call([
            AdminSeeder::class,
            ConsultantSeeder::class,
        ]);
    }
}
