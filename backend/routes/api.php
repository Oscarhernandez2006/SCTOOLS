<?php

use App\Http\Controllers\Admin\ApplicationController as AdminApplicationController;
use App\Http\Controllers\Admin\StatsController;
use App\Http\Controllers\Admin\UserAccessController;
use App\Http\Controllers\Admin\UserController as AdminUserController;
use App\Http\Controllers\ApplicationController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\SiesaCredentialController;
use App\Http\Controllers\SsoController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Public
Route::post('/auth/login', [AuthController::class, 'login']);

Route::get('/health', function () {
    return response()->json(['status' => 'ok', 'message' => 'Santa Cruz Suite API running']);
});

// SSO: canje de ticket server-to-server (protegido por secreto compartido en el controlador)
Route::post('/sso/redeem', [SsoController::class, 'redeem']);

// Protected
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    // El usuario puede cambiar su propia contraseña.
    Route::put('/auth/password', [AuthController::class, 'updatePassword']);

    // Catálogo de aplicaciones a las que el usuario tiene acceso
    Route::get('/applications', [ApplicationController::class, 'index']);

    // Genera un ticket SSO de un solo uso para abrir una app externa
    Route::post('/sso/ticket', [SsoController::class, 'ticket']);

    // Bóveda de credenciales de Siesa (por usuario, cifradas)
    Route::get('/siesa/credentials', [SiesaCredentialController::class, 'show']);
    Route::post('/siesa/credentials', [SiesaCredentialController::class, 'store']);
    Route::delete('/siesa/credentials', [SiesaCredentialController::class, 'destroy']);
    // Usada por la extensión del navegador para autocompletar el login de Siesa
    Route::get('/siesa/credentials/reveal', [SiesaCredentialController::class, 'reveal']);
    // Auto-login puro (sin extensión): datos para armar el cliente HTML5 de Siesa
    Route::get('/siesa/launch', [SiesaCredentialController::class, 'launch']);

    // Administración de permisos (solo admin)
    Route::prefix('admin')->group(function () {
        // Dashboard de estadísticas de la suite (solo admin)
        Route::get('/stats', [StatsController::class, 'index']);

        Route::get('/users', [UserAccessController::class, 'users']);
        Route::get('/applications', [UserAccessController::class, 'applications']);
        Route::get('/users/{user}/applications', [UserAccessController::class, 'show']);
        Route::put('/users/{user}/applications', [UserAccessController::class, 'update']);

        // Gestión de usuarios (CRUD, solo admin)
        Route::get('/manage/users', [AdminUserController::class, 'index']);
        Route::post('/manage/users', [AdminUserController::class, 'store']);
        Route::put('/manage/users/{user}', [AdminUserController::class, 'update']);
        Route::delete('/manage/users/{user}', [AdminUserController::class, 'destroy']);

        // Gestión del catálogo de aplicaciones (CRUD, solo admin)
        Route::get('/manage/applications', [AdminApplicationController::class, 'index']);
        Route::post('/manage/applications', [AdminApplicationController::class, 'store']);
        Route::put('/manage/applications/{application}', [AdminApplicationController::class, 'update']);
        Route::delete('/manage/applications/{application}', [AdminApplicationController::class, 'destroy']);
    });
});
