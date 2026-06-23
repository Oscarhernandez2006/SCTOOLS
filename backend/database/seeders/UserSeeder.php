<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['cedula' => '12345678'],
            [
                'name' => 'Administrador',
                'email' => 'admin@gruposantacruz.com',
                'password' => Hash::make('admin123'),
                'is_active' => true,
            ]
        );
    }
}
