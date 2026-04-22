<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsPatient
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next)
{
    if ($request->user() && $request->user()->system_role === 'patient') {
        return $next($request);
    }

    return response()->json(['message' => 'Unauthorized. Only patients can access this.'], 403);
}
}
