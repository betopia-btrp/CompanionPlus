<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsConsultant
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user() && $request->user()->system_role === 'consultant') {
            return $next($request);
        }

        return response()->json(['message' => 'Access denied. Consultant role required.'], 403);
    }
}
