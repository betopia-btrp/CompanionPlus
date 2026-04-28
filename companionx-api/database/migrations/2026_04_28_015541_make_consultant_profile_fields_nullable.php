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
        Schema::table('consultant_profiles', function (Blueprint $table) {
            $table->string('specialization')->nullable()->change();
            $table->decimal('base_rate_bdt', 10, 2)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('consultant_profiles', function (Blueprint $table) {
            $table->string('specialization')->nullable(false)->change();
            $table->decimal('base_rate_bdt', 10, 2)->nullable(false)->change();
        });
    }
};
