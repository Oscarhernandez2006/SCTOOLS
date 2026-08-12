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
                'slug' => 'siesa',
                'name' => 'Siesa Cloud',
                'description' => 'ERP en la nube: contabilidad, inventario y facturación con inicio de sesión automático',
                'icon' => 'cloud_sync',
                'url' => env('SIESA_URL', 'https://carnesantacruzapp.siesacloud.com/'),
                'category' => 'ERP',
                'color' => '#3D7A5F',
                'logo' => '/logo-siesa.png',
                'keywords' => 'siesa erp cloud contabilidad inventario facturacion',
                'type' => 'app',
                'sso_enabled' => false,
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
            [
                'slug' => 'sigcom',
                'name' => 'SIGCOM',
                'description' => 'Toma de pedidos comercial con integración a Siesa',
                'icon' => 'shopping_cart',
                'url' => env('SIGCOM_URL', 'http://localhost:5173'),
                'category' => 'Comercial',
                'color' => '#B5484A',
                'logo' => '/logo-sigcom.png',
                'keywords' => 'pedidos comercial ventas siesa clientes',
                'type' => 'app',
                'sso_enabled' => true,
                'is_active' => true,
                'sort_order' => 3,
            ],
            [
                'slug' => 'sigcompro',
                'name' => 'SIGCOMPRO',
                'description' => 'Gestión de pedidos, despacho, clientes y cuadre de caja',
                'icon' => 'inventory',
                'url' => env('SIGCOMPRO_URL', 'http://localhost:3000'),
                'category' => 'Operaciones',
                'color' => '#3D7A5F',
                'logo' => '/logo-sigcompro.png',
                'keywords' => 'pedidos despacho clientes cuadre caja cotizaciones',
                'type' => 'app',
                'sso_enabled' => true,
                'is_active' => true,
                'sort_order' => 4,
            ],
            [
                'slug' => 'ejecutables',
                'name' => 'Ejecutables',
                'description' => 'Procesador de integraciones Siesa: carga y procesa archivos Excel (pedidos, requisiciones, sobrecostos)',
                'icon' => 'factory',
                'url' => env('EJECUTABLES_URL', 'http://localhost:5000'),
                'category' => 'Integraciones',
                'color' => '#8B5A8F',
                'logo' => '/logo-ejecutables.svg',
                'keywords' => 'siesa integraciones pedidos requisiciones sobrecostos excel',
                'type' => 'app',
                'sso_enabled' => false,
                'is_active' => true,
                'sort_order' => 5,
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
