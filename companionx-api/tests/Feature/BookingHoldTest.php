<?php

use App\Models\AvailabilitySlot;
use App\Models\ConsultantProfile;
use App\Models\User;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;

function createApprovedConsultantWithSlot(string $email, string $startOffset = '+1 day 10:00', string $endOffset = '+1 day 11:00'): array
{
    $consultantUser = User::factory()->create([
        'system_role' => 'consultant',
        'email' => $email,
    ]);

    $consultant = ConsultantProfile::create([
        'user_id' => $consultantUser->id,
        'specialization' => 'Clinical Psychologist',
        'bio' => 'Supports anxiety and stress.',
        'base_rate_bdt' => 2000,
        'is_approved' => true,
        'average_rating' => 4.8,
    ]);

    $slot = AvailabilitySlot::create([
        'consultant_id' => $consultant->id,
        'start_datetime' => now()->modify($startOffset),
        'end_datetime' => now()->modify($endOffset),
        'is_booked' => false,
        'version' => 0,
    ]);

    return [$consultantUser, $consultant, $slot];
}

it('allows a patient to hold a slot for 15 minutes and fetch the current hold', function () {
    [, $consultant, $slot] = createApprovedConsultantWithSlot('hold-consultant@example.com');

    $patient = User::factory()->create([
        'system_role' => 'patient',
    ]);

    Sanctum::actingAs($patient);

    $this->postJson('/api/booking/hold', [
        'slot_id' => $slot->id,
    ])
        ->assertOk()
        ->assertJsonPath('hold.slot_id', $slot->id)
        ->assertJsonPath('hold.consultant_id', $consultant->id);

    $this->getJson('/api/booking/hold')
        ->assertOk()
        ->assertJsonPath('hold.slot_id', $slot->id);

    $this->getJson('/api/consultants/' . $consultant->id . '/slots')
        ->assertOk()
        ->assertJsonPath('slots.0.status', 'held_by_you');
});

it('prevents another patient from taking a slot that is already held', function () {
    [, , $slot] = createApprovedConsultantWithSlot('second-patient-consultant@example.com');

    $firstPatient = User::factory()->create([
        'system_role' => 'patient',
    ]);

    $secondPatient = User::factory()->create([
        'system_role' => 'patient',
    ]);

    Sanctum::actingAs($firstPatient);
    $this->postJson('/api/booking/hold', [
        'slot_id' => $slot->id,
    ])->assertOk();

    Sanctum::actingAs($secondPatient);
    $this->postJson('/api/booking/hold', [
        'slot_id' => $slot->id,
    ])->assertStatus(422);
});

it('releases expired holds automatically', function () {
    [, $consultant, $slot] = createApprovedConsultantWithSlot('expiry-consultant@example.com');

    $patient = User::factory()->create([
        'system_role' => 'patient',
    ]);

    Sanctum::actingAs($patient);

    $this->postJson('/api/booking/hold', [
        'slot_id' => $slot->id,
    ])->assertOk();

    Carbon::setTestNow(now()->addMinutes(16));

    $this->getJson('/api/booking/hold')
        ->assertOk()
        ->assertJsonPath('hold', null);

    $this->getJson('/api/consultants/' . $consultant->id . '/slots')
        ->assertOk()
        ->assertJsonPath('slots.0.status', 'available');

    Carbon::setTestNow();
});

it('replaces the patient previous hold when a new slot is held', function () {
    [, $consultantOne, $slotOne] = createApprovedConsultantWithSlot('replace-one@example.com');
    [, $consultantTwo, $slotTwo] = createApprovedConsultantWithSlot('replace-two@example.com', '+2 day 10:00', '+2 day 11:00');

    $patient = User::factory()->create([
        'system_role' => 'patient',
    ]);

    Sanctum::actingAs($patient);

    $this->postJson('/api/booking/hold', [
        'slot_id' => $slotOne->id,
    ])->assertOk();

    $this->postJson('/api/booking/hold', [
        'slot_id' => $slotTwo->id,
    ])->assertOk()
        ->assertJsonPath('hold.slot_id', $slotTwo->id)
        ->assertJsonPath('hold.consultant_id', $consultantTwo->id);

    $this->getJson('/api/consultants/' . $consultantOne->id . '/slots')
        ->assertOk()
        ->assertJsonPath('slots.0.status', 'available');

    $this->getJson('/api/consultants/' . $consultantTwo->id . '/slots')
        ->assertOk()
        ->assertJsonPath('slots.0.status', 'held_by_you');
});

it('returns consultant directory data without failing when ai recommendations exist', function () {
    [$consultantUser, $consultant, $slot] = createApprovedConsultantWithSlot('directory-consultant@example.com');

    $patient = User::factory()->create([
        'system_role' => 'patient',
        'onboarding_completed' => true,
    ]);

    \App\Models\AiRecommendation::create([
        'user_id' => $patient->id,
        'source_journal_id' => null,
        'rec_type' => 'consultant_match',
        'content_json' => [
            'status' => 'ready',
            'generated_at' => now()->toISOString(),
            'profile_summary' => [
                'primary_concern' => 'Anxiety',
            ],
            'matches' => [
                [
                    'consultant_id' => $consultant->id,
                    'reason' => 'Good fit for anxiety support.',
                    'rank' => 1,
                ],
            ],
        ],
    ]);

    Sanctum::actingAs($patient);

    $this->getJson('/api/consultants')
        ->assertOk()
        ->assertJsonCount(1, 'ai_data.recommended_consultants')
        ->assertJsonPath('ai_data.recommended_consultants.0.id', $consultant->id)
        ->assertJsonPath('consultants.0.slots.0.id', $slot->id);
});
