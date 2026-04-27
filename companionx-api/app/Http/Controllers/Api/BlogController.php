<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BlogPost;
use App\Models\BlogReaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class BlogController extends Controller
{
    // GET /api/blogs - List published blogs (for patients)
    public function index(Request $request)
    {
        $blogs = BlogPost::where('status', 'published')
            ->with('author:id,first_name,last_name,avatar_url')
            ->select([
                'id',
                'author_id',
                'title',
                'slug',
                'excerpt',
                'cover_image_url',
                'view_count',
                'created_at',
                'updated_at',
            ])
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        $userId = $request->user()?->id;

        $blogs->getCollection()->transform(function ($post) use ($userId) {
            $post->reaction_counts = $post->reactionCounts();
            $post->user_reaction = $post->userReaction($userId);
            return $post;
        });

        return response()->json($blogs);
    }

    // GET /api/blogs/drafts - List draft blogs (for consultants)
    public function drafts(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'Not authenticated'], 401);
            }

            $blogs = BlogPost::where('author_id', $user->id)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json($blogs);
        } catch (\Exception $e) {
            Log::error('BlogController drafts error: ' . $e->getMessage());
            return response()->json([
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ], 500);
        }
    }

    // GET /api/blogs/{slug} - View single blog
    public function show(Request $request, string $slug)
    {
        $blog = BlogPost::where('slug', $slug)->firstOrFail();

        if ($request->user()?->system_role === 'patient' && $blog->status !== 'published') {
            abort(403, 'This post is not published yet.');
        }

        if ($request->user()?->id !== $blog->author_id) {
            $blog->increment('view_count');
        }

        $userId = $request->user()?->id;
        $blog->reaction_counts = $blog->reactionCounts();
        $blog->user_reaction = $blog->userReaction($userId);

        return response()->json($blog);
    }

    // POST /api/blogs - Create new blog post
    public function store(Request $request)
    {
        try {
            $request->validate([
                'title' => 'required|string|max:255',
                'content' => 'required|string',
                'excerpt' => 'nullable|string|max:500',
                'cover_image_url' => 'nullable|url',
                'status' => 'nullable|in:draft,published',
            ]);

            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'Not authenticated'], 401);
            }

            $blog = BlogPost::create([
                'author_id' => $user->id,
                'title' => $request->title,
                'content' => $request->content,
                'excerpt' => $request->excerpt,
                'cover_image_url' => $request->cover_image_url,
                'status' => $request->status ?? 'draft',
            ]);

            return response()->json($blog, 201);
        } catch (\Exception $e) {
            Log::error('BlogController store error: ' . $e->getMessage());
            return response()->json([
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ], 500);
        }
    }

    // PUT /api/blogs/{id} - Update blog post
    public function update(Request $request, int $id)
    {
        $blog = BlogPost::where('author_id', $request->user()->id)->findOrFail($id);

        $request->validate([
            'title' => 'sometimes|string|max:255',
            'content' => 'sometimes|string',
            'excerpt' => 'nullable|string|max:500',
            'cover_image_url' => 'nullable|url',
            'status' => 'sometimes|in:draft,published',
        ]);

        $blog->update($request->only([
            'title',
            'content',
            'excerpt',
            'cover_image_url',
            'status',
        ]));

        return response()->json($blog);
    }

    // DELETE /api/blogs/{id} - Delete blog post
    public function destroy(Request $request, int $id)
    {
        $blog = BlogPost::where('author_id', $request->user()->id)->findOrFail($id);
        $blog->delete();

        return response()->json(['message' => 'Blog post deleted successfully']);
    }

    // POST /api/blogs/{id}/react - Add reaction
    public function react(Request $request, int $id)
    {
        $request->validate([
            'reaction_type' => 'required|in:like,love,insightful,helpful',
        ]);

        $blog = BlogPost::findOrFail($id);

        if ($blog->status !== 'published') {
            abort(403, 'Cannot react to unpublished posts.');
        }

        $userId = $request->user()->id;

        $existing = BlogReaction::where('blog_post_id', $blog->id)
            ->where('user_id', $userId)
            ->first();

        if ($existing && $existing->reaction_type === $request->reaction_type) {
            return response()->json([
                'message' => 'Already reacted with this type.',
            ]);
        }

        BlogReaction::updateOrCreate(
            ['blog_post_id' => $blog->id, 'user_id' => $userId],
            ['reaction_type' => $request->reaction_type]
        );

        $reactionCounts = $blog->fresh()->reactionCounts();

        return response()->json([
            'message' => 'Reaction added.',
            'reaction_counts' => $reactionCounts,
            'user_reaction' => $request->reaction_type,
        ]);
    }

    // DELETE /api/blogs/{id}/react - Remove reaction
    public function unreact(Request $request, int $id)
    {
        $blog = BlogPost::findOrFail($id);
        $userId = $request->user()->id;

        BlogReaction::where('blog_post_id', $blog->id)
            ->where('user_id', $userId)
            ->delete();

        $reactionCounts = $blog->fresh()->reactionCounts();

        return response()->json([
            'message' => 'Reaction removed.',
            'reaction_counts' => $reactionCounts,
            'user_reaction' => null,
        ]);
    }
}