<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class AutoBackup extends Command
{
    protected $signature = 'backup:auto';
    protected $description = 'Créer une sauvegarde automatique de la base de données';

    public function handle()
    {
        $dbPath = config('database.connections.sqlite.database');
        $backupDir = storage_path('app/backups');

        if (!File::isDirectory($backupDir)) {
            File::makeDirectory($backupDir, 0755, true);
        }

        $filename = 'backup_' . now()->format('Y-m-d_His') . '.sqlite';
        $backupPath = $backupDir . '/' . $filename;

        // Copier la base
        if (!File::copy($dbPath, $backupPath)) {
            $this->error("Erreur lors de la copie de la base de données");
            return 1;
        }

        // Compresser
        $gzPath = $backupPath . '.gz';
        $fp = fopen($backupPath, 'r');
        $gz = gzopen($gzPath, 'wb9');
        while (!feof($fp)) {
            gzwrite($gz, fread($fp, 1024 * 512));
        }
        gzclose($gz);
        fclose($fp);

        // Supprimer le fichier non compressé
        File::delete($backupPath);

        $size = File::size($gzPath);
        $this->info("Backup créé: {$filename}.gz (" . $this->formatSize($size) . ")");
        return 0;
    }

    private function formatSize(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $i = 0;
        $size = $bytes;
        while ($size >= 1024 && $i < count($units) - 1) {
            $size /= 1024;
            $i++;
        }
        return round($size, 1) . ' ' . $units[$i];
    }
}
