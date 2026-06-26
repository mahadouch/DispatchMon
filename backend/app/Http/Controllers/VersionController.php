<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;

class VersionController extends Controller
{
    /**
     * GET /api/version
     */
    public function index(): JsonResponse
    {
        $version = $this->getVersion();

        return response()->json([
            'version' => $version,
            'name' => 'DispatchMon',
            'author' => 'mahadouch',
            'github' => 'https://github.com/mahadouch/DispatchMon',
        ]);
    }

    /**
     * GET /api/version/check
     * Vérifier si une mise à jour est disponible
     */
    public function check(): JsonResponse
    {
        $currentVersion = $this->getVersion();

        try {
            $response = Http::timeout(5)
                ->withHeaders(['Accept' => 'application/vnd.github.v3+json'])
                ->get('https://api.github.com/repos/mahadouch/DispatchMon/releases/latest');

            if ($response->successful()) {
                $latest = $response->json();
                $latestVersion = ltrim($latest['tag_name'] ?? '', 'v');

                if (empty($latestVersion)) {
                    return response()->json([
                        'current' => $currentVersion,
                        'latest' => null,
                        'update_available' => false,
                    ]);
                }

                return response()->json([
                    'current' => $currentVersion,
                    'latest' => $latestVersion,
                    'update_available' => version_compare($latestVersion, $currentVersion, '>'),
                    'url' => $latest['html_url'] ?? null,
                    'name' => $latest['name'] ?? null,
                    'published_at' => $latest['published_at'] ?? null,
                ]);
            }
        } catch (\Exception $e) {
            // Silencieux
        }

        return response()->json([
            'current' => $currentVersion,
            'latest' => null,
            'update_available' => false,
        ]);
    }

    private function getVersion(): string
    {
        $versionPath = base_path('VERSION');

        if (File::exists($versionPath)) {
            return trim(File::get($versionPath));
        }

        return 'dev';
    }
}
