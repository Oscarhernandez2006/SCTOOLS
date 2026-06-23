<?php

use App\Http\Controllers\Admin\ApplicationController as AdminApplicationController;
use App\Http\Controllers\Admin\UserAccessController;
use App\Http\Controllers\ApplicationController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\SsoController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Public
Route::post('/auth/login', [AuthController::class, 'login']);

Route::get('/health', function () {
    return response()->json(['status' => 'ok', 'message' => 'SC TOOLS API running']);
});

// SSO: canje de ticket server-to-server (protegido por secreto compartido en el controlador)
Route::post('/sso/redeem', [SsoController::class, 'redeem']);

// Protected
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    // Catálogo de aplicaciones a las que el usuario tiene acceso
    Route::get('/applications', [ApplicationController::class, 'index']);

    // Genera un ticket SSO de un solo uso para abrir una app externa
    Route::post('/sso/ticket', [SsoController::class, 'ticket']);

    // Administración de permisos (solo admin)
    Route::prefix('admin')->group(function () {
        Route::get('/users', [UserAccessController::class, 'users']);
        Route::get('/applications', [UserAccessController::class, 'applications']);
        Route::get('/users/{user}/applications', [UserAccessController::class, 'show']);
        Route::put('/users/{user}/applications', [UserAccessController::class, 'update']);

        // Gestión del catálogo de aplicaciones (CRUD, solo admin)
        Route::get('/manage/applications', [AdminApplicationController::class, 'index']);
        Route::post('/manage/applications', [AdminApplicationController::class, 'store']);
        Route::put('/manage/applications/{application}', [AdminApplicationController::class, 'update']);
        Route::delete('/manage/applications/{application}', [AdminApplicationController::class, 'destroy']);
    });
});
