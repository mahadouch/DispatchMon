<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\File;

class VersionController extends Controller
{
    /**
     * GET /api/version
     */
    public function index(): JsonResponse
    {
        $versionPath = base_path('VERSION');

        if (File::exists($versionPath)) {
            $version = trim(File::get($versionPath));
        } else {
            $version = 'dev';
        }

        return response()->json([
            'version' => $version,
            'name' => 'DispatchMon',
            'author' => 'mahadouch',
            'github' => 'https://github.com/mahadouch/DispatchMon',
        ]);
    }
}
