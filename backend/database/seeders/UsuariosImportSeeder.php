<?php

namespace Database\Seeders;

use App\Models\Application;
use App\Models\SiesaCredential;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Importa los usuarios consolidados de SIGCOM + SIGCOMPRO y enlaza, cuando existe,
 * su credencial de Siesa nube. Fuente: database/data/usuarios-consolidado.csv.
 *
 * - El login es por cédula; el email queda vacío (opcional).
 * - Password inicial = cédula. is_admin = false.
 * - Idempotente: no duplica ni pisa usuarios ya existentes (por cédula).
 */
class UsuariosImportSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('data/usuarios-consolidado.csv');
        if (!is_file($path)) {
            $this->command->error("No se encontró el CSV: {$path}");
            return;
        }

        $fh = fopen($path, 'r');
        $header = fgetcsv($fh);
        if ($header === false) {
            $this->command->error('CSV vacío.');
            fclose($fh);
            return;
        }
        $col = array_flip(array_map(
            fn ($h) => trim(preg_replace('/^\x{FEFF}/u', '', (string) $h)),
            $header,
        ));

        // Ids de apps para asignar accesos.
        $appId = fn (string $slug) => Application::where('slug', $slug)->value('id');
        $idSiesa = $appId('siesa');
        $idSigcom = $appId('sigcom');
        $idSigcompro = $appId('sigcompro');
        $idEjecutables = $appId('ejecutables');

        $creados = 0;
        $existentes = 0;
        $conSiesa = 0;

        while (($row = fgetcsv($fh)) !== false) {
            if (count($row) === 1 && trim((string) $row[0]) === '') {
                continue;
            }

            $get = fn (string $k) => isset($col[$k]) ? trim((string) ($row[$col[$k]] ?? '')) : '';

            $cedula = $get('cedula');
            if ($cedula === '') {
                continue;
            }

            $name = $get('name');
            $email = $get('email');
            $activoRaw = strtolower($get('is_active'));
            $isActive = !in_array($activoRaw, ['false', '0', 'no', 'f'], true);
            $siesaUser = $get('siesa_username');
            $siesaPass = $get('siesa_password');

            $user = User::firstOrNew(['cedula' => $cedula]);
            if (!$user->exists) {
                $user->name = $name !== '' ? $name : $cedula;
                $user->email = $email !== '' ? $email : null;
                $user->is_active = $isActive;
                $user->is_admin = false;
                $user->password = Hash::make($cedula); // password inicial = cédula
                $user->save();
                $creados++;
            } else {
                $existentes++;
            }

            if ($siesaUser !== '') {
                SiesaCredential::updateOrCreate(
                    ['user_id' => $user->id],
                    ['username' => $siesaUser, 'password' => $siesaPass, 'domain' => 'awssiesacloud'],
                );
                $conSiesa++;
            }

            // Accesos: ejecutables para todos; siesa si tiene credencial;
            // sigcom / sigcompro según la base de origen.
            $apps = [$idEjecutables];
            if ($siesaUser !== '' && $idSiesa) {
                $apps[] = $idSiesa;
            }
            $fuentes = array_map('trim', explode('+', strtolower($get('fuente_db'))));
            if (in_array('sigcom', $fuentes, true) && $idSigcom) {
                $apps[] = $idSigcom;
            }
            if (in_array('sigcompro', $fuentes, true) && $idSigcompro) {
                $apps[] = $idSigcompro;
            }
            $user->applications()->syncWithoutDetaching(array_values(array_filter($apps)));
        }
        fclose($fh);

        // Todos los usuarios de la suite tienen acceso a Ejecutables.
        if ($idEjecutables) {
            User::all()->each(fn (User $u) => $u->applications()->syncWithoutDetaching([$idEjecutables]));
        }

        $this->command->info("Usuarios creados: {$creados} | ya existentes: {$existentes} | credenciales Siesa enlazadas: {$conSiesa}");
    }
}
