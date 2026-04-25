<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── 1. Drop consultant_wallets first (has stale consultant_id FK) ──
        Schema::dropIfExists('consultant_wallets');

        // ── 2. Drop FKs that reference consultant_profiles.id ──────
        Schema::table('availability_templates', fn (Blueprint $t) => $t->dropForeign(['consultant_id']));
        Schema::table('availability_slots', fn (Blueprint $t) => $t->dropForeign(['consultant_id']));
        Schema::table('bookings', fn (Blueprint $t) => $t->dropForeign(['consultant_id']));
        Schema::table('reviews', fn (Blueprint $t) => $t->dropForeign(['consultant_id']));

        // ── 3. consultant_profiles: drop id, user_id becomes PK ────
        Schema::table('consultant_profiles', function (Blueprint $t) {
            $t->dropPrimary('consultant_profiles_pkey');
            $t->dropColumn('id');
            $t->primary('user_id');
        });

        // ── 4. Re-add FKs pointing to consultant_profiles.user_id ──
        Schema::table('availability_templates', fn (Blueprint $t) => $t->foreign('consultant_id')->references('user_id')->on('consultant_profiles')->onDelete('cascade'));
        Schema::table('availability_slots', fn (Blueprint $t) => $t->foreign('consultant_id')->references('user_id')->on('consultant_profiles')->onDelete('cascade'));
        Schema::table('bookings', fn (Blueprint $t) => $t->foreign('consultant_id')->references('user_id')->on('consultant_profiles'));
        Schema::table('reviews', fn (Blueprint $t) => $t->foreign('consultant_id')->references('user_id')->on('consultant_profiles'));

        // ── 5. Add balance_bdt to consultant_profiles ──────────────
        Schema::table('consultant_profiles', fn (Blueprint $t) => $t->decimal('balance_bdt', 12, 2)->default(0)->after('average_rating'));

        // ── 6. Drop version from availability_slots ────────────────
        Schema::table('availability_slots', fn (Blueprint $t) => $t->dropColumn('version'));
    }

    public function down(): void
    {
        Schema::table('availability_slots', fn (Blueprint $t) => $t->integer('version')->default(0));
        Schema::table('consultant_profiles', fn (Blueprint $t) => $t->dropColumn('balance_bdt'));

        // Restore FKs to old id
        Schema::table('availability_templates', fn (Blueprint $t) => $t->dropForeign(['consultant_id']));
        Schema::table('availability_slots', fn (Blueprint $t) => $t->dropForeign(['consultant_id']));
        Schema::table('bookings', fn (Blueprint $t) => $t->dropForeign(['consultant_id']));
        Schema::table('reviews', fn (Blueprint $t) => $t->dropForeign(['consultant_id']));

        Schema::table('consultant_profiles', function (Blueprint $t) {
            $t->dropPrimary();
            $t->id();
            $t->primary('id');
        });

        Schema::table('availability_templates', fn (Blueprint $t) => $t->foreign('consultant_id')->references('id')->on('consultant_profiles')->onDelete('cascade'));
        Schema::table('availability_slots', fn (Blueprint $t) => $t->foreign('consultant_id')->references('id')->on('consultant_profiles')->onDelete('cascade'));
        Schema::table('bookings', fn (Blueprint $t) => $t->foreign('consultant_id')->references('id')->on('consultant_profiles'));
        Schema::table('reviews', fn (Blueprint $t) => $t->foreign('consultant_id')->references('id')->on('consultant_profiles'));

        Schema::create('consultant_wallets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('consultant_id')->unique()->constrained('consultant_profiles');
            $table->decimal('balance_bdt', 12, 2)->default(0);
            $table->timestamps();
        });
    }
};
