<?php

use App\Models\AvailabilitySlot;
use App\Models\ConsultantProfile;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('registers consultant accounts with a consultant profile', function () {
    $response = $this->postJson('/api/register', [
        'first_name' => 'Amina',
        'last_name' => 'Rahman',
        'email' => 'amina@example.com',
        'phone' => '01700000001',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'dob' => '1990-01-01',
        'gender' => 'female',
        'guardian_contact' => '01700000002',
        'system_role' => 'consultant',
    ]);

    $response
        ->assertCreated()
        ->assertJsonPath('user.system_role', 'consultant');

    $user = User::where('email', 'amina@example.com')->firstOrFail();

    expect($user->consultantProfile)->not->toBeNull();
    expect($user->consultantProfile?->specialization)->toBe('General Counseling');
});

it('allows consultants to view and update their dashboard profile', function () {
    $consultant = User::factory()->create([
        'system_role' => 'consultant',
    ]);

    ConsultantProfile::create([
        'user_id' => $consultant->id,
        'specialization' => 'Trauma Support',
        'bio' => 'Initial bio.',
        'base_rate_bdt' => 1800,
        'is_approved' => false,
        'average_rating' => 0,
    ]);

    Sanctum::actingAs($consultant);

    $this->getJson('/api/consultant/dashboard')
        ->assertOk()
        ->assertJsonPath('consultant.specialization', 'Trauma Support');

    $this->patchJson('/api/consultant/profile', [
        'specialization' => 'Clinical Psychologist',
        'bio' => 'Updated profile for booking readiness.',
        'base_rate_bdt' => 2200,
    ])
        ->assertOk()
        ->assertJsonPath('consultant.specialization', 'Clinical Psychologist')
        ->assertJsonPath('consultant.base_rate_bdt', 2200);
});

it('allows consultants to create and delete availability slots', function () {
    $consultant = User::factory()->create([
        'system_role' => 'consultant',
    ]);

    ConsultantProfile::create([
        'user_id' => $consultant->id,
        'specialization' => 'Student Counselor',
        'bio' => null,
        'base_rate_bdt' => 1200,
        'is_approved' => false,
        'average_rating' => 0,
    ]);

    Sanctum::actingAs($consultant);

    $start = now()->addDays(1)->setHour(10)->setMinute(0)->setSecond(0);
    $end = now()->addDays(1)->setHour(11)->setMinute(0)->setSecond(0);

    $response = $this->postJson('/api/consultant/slots', [
        'start_datetime' => $start->toISOString(),
        'end_datetime' => $end->toISOString(),
    ]);

    $response
        ->assertCreated()
        ->assertJsonPath('slot.status', 'available');

    $slotId = $response->json('slot.id');

    expect(AvailabilitySlot::find($slotId))->not->toBeNull();

    $this->deleteJson('/api/consultant/slots/' . $slotId)
        ->assertOk();

    expect(AvailabilitySlot::find($slotId))->toBeNull();
});

it('prevents patients from accessing consultant scheduling routes', function () {
    $patient = User::factory()->create([
        'system_role' => 'patient',
    ]);

    Sanctum::actingAs($patient);

    $this->getJson('/api/consultant/dashboard')
        ->assertForbidden();
});
