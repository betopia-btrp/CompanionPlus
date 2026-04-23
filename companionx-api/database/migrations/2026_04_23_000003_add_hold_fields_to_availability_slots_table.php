<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('availability_slots', function (Blueprint $table) {
            $table->foreignId('held_by_user_id')->nullable()->after('is_booked')->constrained('users')->nullOnDelete();
            $table->timestamp('hold_expires_at')->nullable()->after('held_by_user_id');
        });
    }

    public function down(): void
    {
        Schema::table('availability_slots', function (Blueprint $table) {
            $table->dropConstrainedForeignId('held_by_user_id');
            $table->dropColumn('hold_expires_at');
        });
    }
};
