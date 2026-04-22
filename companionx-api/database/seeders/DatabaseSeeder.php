<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::updateOrCreate(
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
            ]
        );

        $this->call(ConsultantSeeder::class);
    }
}
