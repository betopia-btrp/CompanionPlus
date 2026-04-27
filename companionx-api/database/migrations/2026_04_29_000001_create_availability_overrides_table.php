<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Create availability_overrides (replaces availability_slots)
        Schema::create('availability_overrides', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('consultant_id');
            $table->timestamp('start_datetime');
            $table->timestamp('end_datetime');
            $table->string('type'); // 'available' or 'blocked'
            $table->string('reason')->nullable();
            $table->timestamps();

            $table->foreign('consultant_id')->references('user_id')->on('consultant_profiles')->onDelete('cascade');
            $table->index(['consultant_id', 'start_datetime', 'end_datetime']);
        });

        // 2. Drop slot_id FK from bookings, keep start/end datetimes
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropForeign(['slot_id']);
            $table->dropColumn('slot_id');
        });

        // 3. Drop availability_slots table
        Schema::dropIfExists('availability_slots');
    }

    public function down(): void
    {
        Schema::dropIfExists('availability_overrides');
    }
};
