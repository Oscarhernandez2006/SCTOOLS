<?php

namespace App\Http\Controllers;

use App\Models\LoginLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'cedula' => 'required|string',
            'password' => 'required|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
        ]);

        $clientInfo = $this->extractClientInfo($request);
        $user = User::where('cedula', $request->cedula)->first();

        // Failed: user not found or wrong password
        if (!$user || !Hash::check($request->password, $user->password)) {
            LoginLog::create([
                'user_id' => $user?->id,
                'cedula' => $request->cedula,
                'status' => 'failed',
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'browser' => $clientInfo['browser'],
                'device_type' => $clientInfo['device_type'],
                'os' => $clientInfo['os'],
                'latitude' => $request->latitude,
                'longitude' => $request->longitude,
            ]);

            return response()->json([
                'message' => 'Credenciales incorrectas',
            ], 401);
        }

        // Failed: user inactive
        if (!$user->is_active) {
            LoginLog::create([
                'user_id' => $user->id,
                'cedula' => $request->cedula,
                'status' => 'failed',
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'browser' => $clientInfo['browser'],
                'device_type' => $clientInfo['device_type'],
                'os' => $clientInfo['os'],
                'latitude' => $request->latitude,
                'longitude' => $request->longitude,
            ]);

            return response()->json([
                'message' => 'Usuario inactivo. Contacte al administrador.',
            ], 403);
        }

        // Success
        LoginLog::create([
            'user_id' => $user->id,
            'cedula' => $request->cedula,
            'status' => 'success',
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'browser' => $clientInfo['browser'],
            'device_type' => $clientInfo['device_type'],
            'os' => $clientInfo['os'],
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
        ]);

        // Revoke previous tokens and create a new one
        $user->tokens()->delete();
        $token = $user->createToken('sc-tools')->plainTextToken;

        return response()->json([
            'message' => 'Inicio de sesión exitoso',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'cedula' => $user->cedula,
                'email' => $user->email,
                'is_admin' => $user->is_admin,
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Sesión cerrada']);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'cedula' => $user->cedula,
            'email' => $user->email,
            'is_admin' => $user->is_admin,
        ]);
    }

    private function extractClientInfo(Request $request): array
    {
        $ua = $request->userAgent() ?? '';

        // Detect browser
        $browser = 'Desconocido';
        if (preg_match('/Edg\//i', $ua)) $browser = 'Edge';
        elseif (preg_match('/OPR|Opera/i', $ua)) $browser = 'Opera';
        elseif (preg_match('/Chrome/i', $ua)) $browser = 'Chrome';
        elseif (preg_match('/Firefox/i', $ua)) $browser = 'Firefox';
        elseif (preg_match('/Safari/i', $ua)) $browser = 'Safari';
        elseif (preg_match('/MSIE|Trident/i', $ua)) $browser = 'Internet Explorer';

        // Detect OS
        $os = 'Desconocido';
        if (preg_match('/Windows NT 10/i', $ua)) $os = 'Windows 10/11';
        elseif (preg_match('/Windows/i', $ua)) $os = 'Windows';
        elseif (preg_match('/Mac OS X/i', $ua)) $os = 'macOS';
        elseif (preg_match('/Linux/i', $ua)) $os = 'Linux';
        elseif (preg_match('/Android/i', $ua)) $os = 'Android';
        elseif (preg_match('/iPhone|iPad/i', $ua)) $os = 'iOS';

        // Detect device type
        $deviceType = 'Desktop';
        if (preg_match('/Mobile|Android.*Mobile|iPhone/i', $ua)) $deviceType = 'Mobile';
        elseif (preg_match('/Tablet|iPad/i', $ua)) $deviceType = 'Tablet';

        return [
            'browser' => $browser,
            'os' => $os,
            'device_type' => $deviceType,
        ];
    }
}
