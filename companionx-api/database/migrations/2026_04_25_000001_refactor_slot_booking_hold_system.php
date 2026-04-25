<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add hold_expires_at to bookings (booking IS the hold now)
        Schema::table('bookings', function (Blueprint $table) {
            $table->timestamp('hold_expires_at')->nullable()->after('scheduled_end');
        });

        // 2. Add source_template_id to availability_slots
        Schema::table('availability_slots', function (Blueprint $table) {
            $table->foreignId('source_template_id')
                ->nullable()
                ->after('version')
                ->constrained('availability_templates')
                ->nullOnDelete();
        });

        // 3. Drop hold/is_booked columns from availability_slots
        Schema::table('availability_slots', function (Blueprint $table) {
            $table->dropForeign(['held_by_user_id']);
            $table->dropColumn(['is_booked', 'held_by_user_id', 'hold_expires_at']);
        });
    }

    public function down(): void
    {
        Schema::table('availability_slots', function (Blueprint $table) {
            $table->boolean('is_booked')->default(false)->after('end_datetime');
            $table->foreignId('held_by_user_id')->nullable()->after('is_booked')->constrained('users')->nullOnDelete();
            $table->timestamp('hold_expires_at')->nullable()->after('held_by_user_id');
            $table->dropForeign(['source_template_id']);
            $table->dropColumn('source_template_id');
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn('hold_expires_at');
        });
    }
};
