<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blog_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('author_id')->constrained('users')->onDelete('cascade');
            $table->string('title');
            $table->text('content');
            $table->string('slug')->unique();
            $table->string('excerpt')->nullable();
            $table->string('cover_image_url')->nullable();
            $table->enum('status', ['draft', 'published'])->default('draft');
            $table->unsignedBigInteger('view_count')->default(0);
            $table->timestamps();
        });

        Schema::create('blog_reactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('blog_post_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('reaction_type'); // 'like', 'love', 'insightful', 'helpful'
            $table->timestamps();
            $table->unique(['blog_post_id', 'user_id', 'reaction_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blog_reactions');
        Schema::dropIfExists('blog_posts');
    }
};