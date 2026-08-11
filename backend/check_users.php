<?php
require 'vendor/autoload.php';

$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$users = \App\Models\User::all(['id', 'name', 'email', 'cedula']);
echo "\n=== USUARIOS EN SCTOOLS ===\n";
foreach ($users as $user) {
    echo $user->id . ". " . $user->name . " (" . $user->email . ") - Cédula: " . $user->cedula . "\n";
}
echo "\n";
