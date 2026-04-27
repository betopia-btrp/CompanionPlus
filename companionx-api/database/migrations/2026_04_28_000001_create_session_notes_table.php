<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('session_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->unique()->constrained()->onDelete('cascade');
            $table->unsignedBigInteger('consultant_id');
            $table->text('notes')->nullable();
            $table->text('private_notes')->nullable();
            $table->timestamps();

            $table->foreign('consultant_id')->references('user_id')->on('consultant_profiles')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('session_notes');
    }
};
