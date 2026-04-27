<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user() && $request->user()->system_role === 'admin') {
            return $next($request);
        }

        return response()->json(['message' => 'Access denied. Admin role required.'], 403);
    }
}
