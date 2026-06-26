<?php

namespace App\Http\Middleware;

use App\Models\ApiToken;
use Closure;
use Illuminate\Http\Request;

class AuthToken
{
    public function handle(Request $request, Closure $next)
    {
        $token = $request->header('Authorization');
        if ($token) {
            $token = str_replace('Bearer ', '', $token);
        }

        if (!$token) {
            return response()->json(['error' => 'Non authentifié'], 401);
        }

        $apiToken = ApiToken::where('token', $token)->with('user')->first();

        if (!$apiToken) {
            return response()->json(['error' => 'Token invalide'], 401);
        }

        $request->setUser($apiToken->user);

        return $next($request);
    }
}
