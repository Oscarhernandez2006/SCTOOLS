<?php

namespace Database\Seeders;

use App\Models\Application;
use App\Models\User;
use Illuminate\Database\Seeder;

class ApplicationSeeder extends Seeder
{
    /**
     * Seed the applications catalog and grant access to existing users.
     */
    public function run(): void
    {
        $applications = [
            [
                'slug' => 'sigcan',
                'name' => 'SIGCAN',
                'description' => 'Gestión de canastillas, alquileres, facturación, inventario y trazabilidad',
                'icon' => 'inventory_2',
                'url' => 'https://canastillas-web.vercel.app/',
                'category' => 'Canastillas',
                'color' => '#3D7A5F',
                'logo' => 'logosican.png',
                'keywords' => 'canastillas alquiler facturacion inventario trazabilidad',
                'type' => 'app',
                'sso_enabled' => true,
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'slug' => 'incapacidades',
                'name' => 'Incapacidades',
                'description' => 'Registro y gestión de incapacidades médicas del personal del grupo empresarial',
                'icon' => 'medical_information',
                'url' => 'https://formularioincapacidades.grupo-santacruz.com/',
                'category' => 'RRHH',
                'color' => '#4A7FB5',
                'logo' => null,
                'keywords' => 'formulario incapacidad medica empleados',
                'type' => 'form',
                'sso_enabled' => false,
                'is_active' => true,
                'sort_order' => 2,
            ],
        ];

        foreach ($applications as $data) {
            Application::updateOrCreate(['slug' => $data['slug']], $data);
        }

        // Otorgar acceso a todas las apps a los usuarios existentes (estado inicial).
        // Más adelante esto se gestiona individualmente desde la administración de permisos.
        $allApplicationIds = Application::pluck('id');
        User::all()->each(function (User $user) use ($allApplicationIds) {
            $user->applications()->syncWithoutDetaching($allApplicationIds);
        });
    }
}
