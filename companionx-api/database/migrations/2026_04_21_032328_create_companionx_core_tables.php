<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
{
    // 1. Subscriptions
    Schema::create('subscriptions', function (Blueprint $table) {
        $table->id();
        $table->foreignId('user_id')->constrained()->onDelete('cascade');
        $table->string('stripe_subscription_id')->unique();
        $table->string('tier'); // free, student, premium
        $table->string('status'); // active, trialing, etc
        $table->timestamp('current_period_end');
        $table->timestamps();
    });

    // 2. Consultant Profiles
    Schema::create('consultant_profiles', function (Blueprint $table) {
        $table->id();
        $table->foreignId('user_id')->unique()->constrained()->onDelete('cascade');
        $table->string('specialization');
        $table->text('bio')->nullable();
        $table->decimal('base_rate_bdt', 10, 2);
        $table->boolean('is_approved')->default(false);
        $table->float('average_rating')->default(0);
        $table->timestamps();
    });

    // 3. Availability Template & Slots
    Schema::create('availability_templates', function (Blueprint $table) {
        $table->id();
        $table->foreignId('consultant_id')->constrained('consultant_profiles')->onDelete('cascade');
        $table->integer('day_of_week'); // 0-6
        $table->time('start_time');
        $table->time('end_time');
        $table->timestamps();
    });

    Schema::create('availability_slots', function (Blueprint $table) {
        $table->id();
        $table->foreignId('consultant_id')->constrained('consultant_profiles')->onDelete('cascade');
        $table->timestamp('start_datetime');
        $table->timestamp('end_datetime');
        $table->boolean('is_booked')->default(false);
        $table->integer('version')->default(0); // For race conditions
        $table->timestamps();
        $table->unique(['consultant_id', 'start_datetime']);
    });

    // 4. Bookings
    Schema::create('bookings', function (Blueprint $table) {
        $table->id();
        $table->foreignId('patient_id')->constrained('users');
        $table->foreignId('consultant_id')->constrained('consultant_profiles');
        $table->foreignId('slot_id')->unique()->constrained('availability_slots');
        $table->string('status')->default('pending');
        $table->uuid('jitsi_room_uuid')->unique();
        $table->decimal('price_at_booking', 10, 2);
        $table->timestamp('scheduled_start');
        $table->timestamp('scheduled_end');
        $table->timestamps();
    });

    // 5. Transactions & Wallets
    Schema::create('transactions', function (Blueprint $table) {
        $table->id();
        $table->foreignId('booking_id')->nullable()->constrained();
        $table->foreignId('user_id')->constrained();
        $table->string('type'); // payment, refund, payout
        $table->string('status')->default('pending'); // pending, succeeded, failed
        $table->string('stripe_reference_id')->unique()->nullable();
        $table->decimal('total_amount', 10, 2);
        $table->decimal('platform_fee', 10, 2)->default(0);
        $table->decimal('consultant_net', 10, 2)->default(0);
        $table->string('currency')->default('BDT');
        $table->timestamps();
    });

    Schema::create('consultant_wallets', function (Blueprint $table) {
        $table->id();
        $table->foreignId('consultant_id')->unique()->constrained('consultant_profiles');
        $table->decimal('balance_bdt', 12, 2)->default(0);
        $table->timestamps();
    });

    // 6. Wellness, AI & Reviews
    Schema::create('mood_journal', function (Blueprint $table) {
        $table->id();
        $table->foreignId('user_id')->constrained()->onDelete('cascade');
        $table->string('emoji_mood');
        $table->text('text_note')->nullable();
        $table->float('sentiment_score')->nullable();
        $table->boolean('is_at_risk')->default(false);
        $table->timestamps();
    });

    Schema::create('ai_recommendations', function (Blueprint $table) {
        $table->id();
        $table->foreignId('user_id')->constrained()->onDelete('cascade');
        $table->foreignId('source_journal_id')->nullable()->constrained('mood_journal');
        $table->string('rec_type'); // exercise, consultant_match
        $table->jsonb('content_json');
        $table->timestamps();
    });

    Schema::create('reviews', function (Blueprint $table) {
        $table->id();
        $table->foreignId('booking_id')->unique()->constrained();
        $table->foreignId('patient_id')->constrained('users');
        $table->foreignId('consultant_id')->constrained('consultant_profiles');
        $table->integer('rating'); // 1-5
        $table->text('comment')->nullable();
        $table->timestamps();
    });

    // 7. Safety & Onboarding (Added Onboarding table for your Task #6)
    Schema::create('onboarding_answers', function (Blueprint $table) {
        $table->id();
        $table->foreignId('user_id')->constrained()->onDelete('cascade');
        $table->string('question_key');
        $table->text('answer_text');
        $table->timestamps();
    });

    Schema::create('safety_alerts', function (Blueprint $table) {
        $table->id();
        $table->foreignId('journal_id')->constrained('mood_journal');
        $table->foreignId('patient_id')->constrained('users');
        $table->string('status')->default('new');
        $table->string('severity')->default('medium');
        $table->foreignId('assigned_admin_id')->nullable()->constrained('users');
        $table->timestamp('resolved_at')->nullable();
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
{
    // Drop in reverse order to avoid foreign key errors
    Schema::dropIfExists('safety_alerts');
    Schema::dropIfExists('onboarding_answers');
    Schema::dropIfExists('reviews');
    Schema::dropIfExists('ai_recommendations');
    Schema::dropIfExists('mood_journal');
    Schema::dropIfExists('consultant_wallets');
    Schema::dropIfExists('transactions');
    Schema::dropIfExists('bookings');
    Schema::dropIfExists('availability_slots');
    Schema::dropIfExists('availability_templates');
    Schema::dropIfExists('consultant_profiles');
    Schema::dropIfExists('subscriptions');
}
};
