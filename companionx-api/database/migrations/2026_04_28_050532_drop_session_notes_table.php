<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('session_notes');
    }

    public function down(): void
    {
        // Irreversible — table was created in a separate migration
    }
};
