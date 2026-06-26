<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class ApiKey
{
    public function handle(Request $request, Closure $next)
    {
        $apiKey = config('app.api_key');

        // Si aucune API key n'est configurée, laisser passer
        if (!$apiKey) {
            return $next($request);
        }

        $provided = $request->header('X-API-Key');

        if ($provided !== $apiKey) {
            return response()->json(['error' => 'API key invalide'], 403);
        }

        return $next($request);
    }
}
