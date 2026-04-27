<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class BlogPost extends Model
{
    protected $table = 'blog_posts';

    protected $fillable = [
        'author_id',
        'title',
        'content',
        'slug',
        'excerpt',
        'cover_image_url',
        'status',
        'view_count',
    ];

    protected function casts(): array
    {
        return [
            'view_count' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (BlogPost $post) {
            if (empty($post->slug)) {
                $post->slug = static::generateUniqueSlug($post->title);
            }
            if (empty($post->excerpt)) {
                $post->excerpt = Str::limit(strip_tags($post->content), 160);
            }
        });

        static::updating(function (BlogPost $post) {
            if ($post->isDirty('title') && empty($post->slug)) {
                $post->slug = static::generateUniqueSlug($post->title);
            }
        });
    }

    public static function generateUniqueSlug(string $title): string
    {
        $slug = Str::slug($title);
        $originalSlug = $slug;
        $counter = 1;

        while (static::where('slug', $slug)->exists()) {
            $slug = "{$originalSlug}-{$counter}";
            $counter++;
        }

        return $slug;
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function reactions(): HasMany
    {
        return $this->hasMany(BlogReaction::class, 'blog_post_id');
    }

    public function reactionCounts(): array
    {
        $counts = $this->reactions()
            ->select('reaction_type')
            ->selectRaw('COUNT(*) as count')
            ->groupBy('reaction_type')
            ->pluck('count', 'reaction_type')
            ->toArray();

        return [
            'like' => $counts['like'] ?? 0,
            'love' => $counts['love'] ?? 0,
            'insightful' => $counts['insightful'] ?? 0,
            'helpful' => $counts['helpful'] ?? 0,
        ];
    }

    public function userReaction(?int $userId): ?string
    {
        if (!$userId) {
            return null;
        }

        return $this->reactions()
            ->where('user_id', $userId)
            ->value('reaction_type');
    }
}