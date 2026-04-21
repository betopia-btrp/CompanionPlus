<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\ConsultantProfile;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class ConsultantSeeder extends Seeder
{
    public function run(): void
    {
        $consultants = [
            ['name' => 'Dr. Ariful Islam', 'special' => 'Clinical Psychologist', 'bio' => 'Expert in CBT and clinical depression. 10 years experience in hospital settings.'],
            ['name' => 'Sabrina Hassan', 'special' => 'Student Counselor', 'bio' => 'Specializes in academic pressure, exam anxiety, and student life transitions.'],
            ['name' => 'Farhan Chowdhury', 'special' => 'Career Coach', 'bio' => 'Helping young professionals navigate workplace stress and career burnout.'],
            ['name' => 'Dr. Nusrat Jahan', 'special' => 'Family Therapist', 'bio' => 'Focuses on relationship issues, family dynamics, and social anxiety.'],
            ['name' => 'Tanvir Ahmed', 'special' => 'Stress Management', 'bio' => 'Uses mindfulness and action-oriented tools to manage daily stress and panic.'],
            ['name' => 'Laila Rahman', 'special' => 'Trauma Specialist', 'bio' => 'Certified in deep-dive therapy for past trauma and long-term emotional recovery.'],
            ['name' => 'Imtiaz Hossain', 'special' => 'Addiction Counselor', 'bio' => 'Specialized in habit breaking and behavioral therapy for addiction.'],
            ['name' => 'Sonia Mirza', 'special' => 'Self-Esteem Coach', 'bio' => 'Passionate about helping people build confidence and personal growth.'],
            ['name' => 'Dr. Kamal Uddin', 'special' => 'Senior Psychiatrist', 'bio' => 'Holistic approach to mood disorders and severe anxiety cases.'],
            ['name' => 'Nabila Islam', 'special' => 'Grief Counselor', 'bio' => 'Empathetic listening and support for those dealing with loss and grief.'],
        ];

        foreach ($consultants as $index => $c) {
            DB::transaction(function () use ($c, $index) {
                // 1. Create the User
                $names = explode(' ', $c['name']);
                $user = User::create([
                    'first_name' => $names[0],
                    'last_name' => isset($names[1]) ? $names[1] : 'Consultant',
                    'email' => 'consultant' . ($index + 1) . '@companionx.com',
                    'password' => Hash::make('password123'),
                    'phone' => '017000000' . $index,
                    'dob' => '1985-01-01',
                    'gender' => 'other',
                    'system_role' => 'consultant',
                ]);

                // 2. Create the Profile
                ConsultantProfile::create([
                    'user_id' => $user->id,
                    'specialization' => $c['special'],
                    'bio' => $c['bio'],
                    'base_rate_bdt' => rand(800, 2000), // Random rate between 800-2000
                    'is_approved' => true,
                ]);

                // 3. Create the Wallet (for the 90% payout rule)
                DB::table('consultant_wallets')->insert([
                    'consultant_id' => $user->id, // Usually linked to profile id, adjust if needed
                    'balance_bdt' => 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });
        }
    }
}