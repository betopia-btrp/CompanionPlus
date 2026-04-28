<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsConsultant
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user || $user->system_role !== 'consultant') {
            return response()->json(['message' => 'Access denied. Consultant role required.'], 403);
        }

        if (!$user->consultantProfile?->is_approved) {
            $isProfileRoute = $request->is('api/consultant/profile') || $request->is('api/consultant/dashboard');
            if (!$isProfileRoute) {
                return response()->json(['message' => 'Consultant not yet approved.'], 403);
            }
        }

        return $next($request);
    }
}
