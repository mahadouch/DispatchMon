<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\File;

class BackupController extends Controller
{
    private string $dbPath;
    private string $backupDir;

    public function __construct()
    {
        $this->dbPath = env('DB_DATABASE', '/var/www/html/database/database.sqlite');
        $this->backupDir = storage_path('app/backups');
        if (!File::isDirectory($this->backupDir)) {
            File::makeDirectory($this->backupDir, 0755, true);
        }
    }

    /**
     * GET /api/backups
     * Lister tous les backups
     */
    public function index(): JsonResponse
    {
        $backups = [];
        $files = File::files($this->backupDir);

        foreach ($files as $file) {
            if ($file->getExtension() === 'sqlite') {
                $backups[] = [
                    'name' => $file->getFilenameWithoutExtension(),
                    'filename' => $file->getFilename(),
                    'size' => $file->getSize(),
                    'size_human' => $this->formatBytes($file->getSize()),
                    'created_at' => date('Y-m-d H:i:s', $file->getMTime()),
                ];
            }
        }

        // Trier par date décroissante
        usort($backups, fn($a, $b) => strcmp($b['created_at'], $a['created_at']));

        return response()->json($backups);
    }

    /**
     * POST /api/backups
     * Créer un backup
     */
    public function create(): JsonResponse
    {
        if (!File::exists($this->dbPath)) {
            return response()->json(['error' => 'Base de données non trouvée'], 404);
        }

        $name = 'backup_' . date('Y-m-d_H-i-s');
        $backupPath = $this->backupDir . "/{$name}.sqlite";

        try {
            // Copier la base de données
            File::copy($this->dbPath, $backupPath);

            // Vérifier que la copie est valide
            if (!File::exists($backupPath) || filesize($backupPath) === 0) {
                return response()->json(['error' => 'Échec de la copie'], 500);
            }

            $size = filesize($backupPath);

            return response()->json([
                'status' => 'ok',
                'name' => $name,
                'filename' => "{$name}.sqlite",
                'size' => $size,
                'size_human' => $this->formatBytes($size),
                'created_at' => date('Y-m-d H:i:s'),
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /api/backups/{name}/restore
     * Restaurer un backup
     */
    public function restore(string $name): JsonResponse
    {
        $backupPath = $this->backupDir . "/{$name}.sqlite";

        if (!File::exists($backupPath)) {
            return response()->json(['error' => 'Backup non trouvé'], 404);
        }

        try {
            // Vérifier que le backup est une SQLite valide
            $handle = fopen($backupPath, 'rb');
            $header = fread($handle, 16);
            fclose($handle);

            if (substr($header, 0, 16) !== 'SQLite format 3  ') {
                return response()->json(['error' => 'Fichier invalide (pas une base SQLite)'], 400);
            }

            // Copier le backup par-dessus la base actuelle
            File::copy($backupPath, $this->dbPath);

            return response()->json([
                'status' => 'ok',
                'message' => "Base restaurée depuis {$name}",
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/backups/{name}/download
     * Télécharger un backup
     */
    public function download(string $name): Response|JsonResponse
    {
        $backupPath = $this->backupDir . "/{$name}.sqlite";

        if (!File::exists($backupPath)) {
            return response()->json(['error' => 'Backup non trouvé'], 404);
        }

        return response()->download($backupPath, "{$name}.sqlite", [
            'Content-Type' => 'application/octet-stream',
        ]);
    }

    /**
     * DELETE /api/backups/{name}
     * Supprimer un backup
     */
    public function delete(string $name): JsonResponse
    {
        $backupPath = $this->backupDir . "/{$name}.sqlite";

        if (!File::exists($backupPath)) {
            return response()->json(['error' => 'Backup non trouvé'], 404);
        }

        File::delete($backupPath);

        return response()->json(['status' => 'ok', 'message' => "Backup {$name} supprimé"]);
    }

    /**
     * Convertir octets en taille lisible
     */
    private function formatBytes(int $bytes): string
    {
        $k = 1024;
        $sizes = ['B', 'KB', 'MB', 'GB'];
        $i = (int) floor(log($bytes, $k));
        return round($bytes / pow($k, $i), 1) . ' ' . $sizes[$i];
    }
}
