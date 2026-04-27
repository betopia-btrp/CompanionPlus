<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@companionx.com'],
            [
                'first_name' => 'Admin',
                'last_name' => 'User',
                'phone' => '01700000001',
                'password' => Hash::make('AdminPass123!'),
                'dob' => '1990-01-01',
                'gender' => 'other',
                'guardian_contact' => null,
                'system_role' => 'admin',
                'subscription_plan_id' => null,
            ]
        );
    }
}
