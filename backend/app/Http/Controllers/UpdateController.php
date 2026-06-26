<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Process;

class UpdateController extends Controller
{
    /**
     * POST /api/update
     * Pull le dernier code et redémarre le service
     */
    public function update(): JsonResponse
    {
        $results = [];
        $basePath = base_path('..');

        // Git pull
        $git = Process::run("cd {$basePath} && git pull origin master 2>&1");
        $results['git_pull'] = [
            'output' => $git->output(),
            'success' => $git->successful(),
        ];

        if (!$git->successful()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Échec du git pull',
                'results' => $results,
            ], 500);
        }

        // Vérifier si le backend doit être rebuild
        $backendChanged = str_contains($git->output(), 'backend/') || str_contains($git->output(), 'Dockerfile');
        if ($backendChanged) {
            $build = Process::run("cd {$basePath} && docker compose build backend 2>&1");
            $results['build_backend'] = [
                'output' => $build->output(),
                'success' => $build->successful(),
            ];
        }

        // Redémarrer les conteneurs
        $restart = Process::run("cd {$basePath} && docker compose up -d 2>&1");
        $results['restart'] = [
            'output' => $restart->output(),
            'success' => $restart->successful(),
        ];

        // Lancer les migrations
        $migrate = Process::run("cd {$basePath} && docker compose exec -T backend php artisan migrate --force 2>&1");
        $results['migrate'] = [
            'output' => $migrate->output(),
            'success' => $migrate->successful(),
        ];

        return response()->json([
            'status' => 'ok',
            'message' => 'Mise à jour effectuée',
            'results' => $results,
        ]);
    }
}
