<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BlogPost;
use App\Models\Booking;
use App\Models\ConsultantProfile;
use App\Models\SafetyAlert;
use App\Models\User;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    public function summary()
    {
        $activeBookingStatuses = ['booked', 'pending', 'confirmed'];

        return response()->json([
            'stats' => [
                'users' => User::count(),
                'consultants' => ConsultantProfile::count(),
                'pending_consultants' => ConsultantProfile::where('is_approved', false)->count(),
                'active_bookings' => Booking::whereIn('status', $activeBookingStatuses)->count(),
                'open_safety_alerts' => SafetyAlert::where('status', '!=', 'resolved')->count(),
                'published_posts' => BlogPost::where('status', 'published')->count(),
            ],
            'recent_alerts' => SafetyAlert::with('patient:id,first_name,last_name')
                ->orderByDesc('created_at')
                ->limit(5)
                ->get()
                ->map(fn (SafetyAlert $alert) => $this->serializeSafetyAlert($alert, false))
                ->values(),
            'recent_bookings' => Booking::with([
                    'patient:id,first_name,last_name',
                    'consultant.user:id,first_name,last_name',
                ])
                ->orderByDesc('scheduled_start')
                ->limit(5)
                ->get()
                ->map(fn (Booking $booking) => $this->serializeBooking($booking))
                ->values(),
        ]);
    }

    public function users()
    {
        $users = User::select([
                'id',
                'first_name',
                'last_name',
                'email',
                'system_role',
                'onboarding_completed',
                'created_at',
            ])
            ->orderByDesc('created_at')
            ->paginate(50);

        return response()->json($users);
    }

    public function consultants()
    {
        $consultants = ConsultantProfile::with('user:id,first_name,last_name,email')
            ->orderBy('is_approved')
            ->orderByDesc('created_at')
            ->paginate(50);

        $consultants->getCollection()->transform(fn (ConsultantProfile $profile) => [
            'id' => $profile->user_id,
            'user_id' => $profile->user_id,
            'name' => $this->formatUserName($profile->user),
            'email' => $profile->user?->email ?? '',
            'specialization' => $profile->specialization,
            'base_rate_bdt' => $profile->base_rate_bdt,
            'average_rating' => $profile->average_rating,
            'is_approved' => $profile->is_approved,
        ]);

        return response()->json($consultants);
    }

    public function updateConsultantApproval(Request $request, int $consultantId)
    {
        $validated = $request->validate([
            'is_approved' => 'required|boolean',
        ]);

        $profile = ConsultantProfile::where('user_id', $consultantId)->firstOrFail();
        $profile->update(['is_approved' => $validated['is_approved']]);

        return response()->json([
            'message' => $validated['is_approved'] ? 'Consultant approved.' : 'Consultant suspended.',
            'consultant' => [
                'id' => $profile->user_id,
                'user_id' => $profile->user_id,
                'is_approved' => $profile->is_approved,
            ],
        ]);
    }

    public function bookings()
    {
        $bookings = Booking::with([
                'patient:id,first_name,last_name',
                'consultant.user:id,first_name,last_name',
            ])
            ->orderByDesc('scheduled_start')
            ->paginate(50);

        $bookings->getCollection()->transform(fn (Booking $booking) => $this->serializeBooking($booking));

        return response()->json($bookings);
    }

    public function safetyAlerts()
    {
        $alerts = SafetyAlert::with([
                'patient:id,first_name,last_name',
                'journal:id,text_note',
            ])
            ->orderByRaw("CASE WHEN status = 'resolved' THEN 1 ELSE 0 END")
            ->orderByDesc('created_at')
            ->paginate(50);

        $alerts->getCollection()->transform(fn (SafetyAlert $alert) => $this->serializeSafetyAlert($alert));

        return response()->json($alerts);
    }

    public function updateSafetyAlert(Request $request, int $alertId)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:new,open,resolved',
        ]);

        $alert = SafetyAlert::findOrFail($alertId);
        $alert->update([
            'status' => $validated['status'],
            'assigned_admin_id' => $request->user()->id,
            'resolved_at' => $validated['status'] === 'resolved' ? now() : null,
        ]);

        return response()->json([
            'message' => 'Safety alert updated.',
            'alert' => $this->serializeSafetyAlert($alert->fresh(['patient', 'journal'])),
        ]);
    }

    public function blogs()
    {
        $posts = BlogPost::with('author:id,first_name,last_name')
            ->select(['id', 'author_id', 'title', 'slug', 'status', 'view_count', 'created_at'])
            ->orderByDesc('created_at')
            ->paginate(50);

        $posts->getCollection()->transform(fn (BlogPost $post) => [
            'id' => $post->id,
            'title' => $post->title,
            'slug' => $post->slug,
            'status' => $post->status,
            'author_name' => $this->formatUserName($post->author),
            'view_count' => $post->view_count,
            'created_at' => $post->created_at,
        ]);

        return response()->json($posts);
    }

    public function updateBlog(Request $request, int $postId)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:draft,published',
        ]);

        $post = BlogPost::findOrFail($postId);
        $post->update(['status' => $validated['status']]);

        return response()->json([
            'message' => 'Blog post updated.',
            'post' => $post,
        ]);
    }

    public function deleteBlog(int $postId)
    {
        BlogPost::findOrFail($postId)->delete();

        return response()->json(['message' => 'Blog post deleted.']);
    }

    private function serializeBooking(Booking $booking): array
    {
        return [
            'id' => $booking->id,
            'status' => $booking->status,
            'patient_name' => $this->formatUserName($booking->patient),
            'consultant_name' => $this->formatUserName($booking->consultant?->user),
            'scheduled_start' => $booking->scheduled_start,
            'scheduled_end' => $booking->scheduled_end,
            'price_at_booking' => $booking->price_at_booking,
        ];
    }

    private function serializeSafetyAlert(SafetyAlert $alert, bool $includeExcerpt = true): array
    {
        $payload = [
            'id' => $alert->id,
            'patient_name' => $this->formatUserName($alert->patient),
            'severity' => $alert->severity,
            'status' => $alert->status,
            'created_at' => $alert->created_at,
            'resolved_at' => $alert->resolved_at,
        ];

        if ($includeExcerpt) {
            $payload['excerpt'] = $alert->journal?->text_note;
        }

        return $payload;
    }

    private function formatUserName(?User $user): string
    {
        if (!$user) {
            return 'Unknown User';
        }

        return trim("{$user->first_name} {$user->last_name}") ?: $user->email;
    }
}
