<?php

namespace App\Http\Controllers;

use App\Models\SiesaCredential;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SiesaCredentialController extends Controller
{
    /**
     * Estado de las credenciales Siesa del usuario autenticado.
     * Nunca devuelve la contraseña.
     */
    public function show(Request $request): JsonResponse
    {
        $cred = SiesaCredential::where('user_id', $request->user()->id)->first();

        return response()->json([
            'has_credentials' => (bool) $cred,
            'domain' => $cred->domain ?? 'awssiesacloud',
            'username' => $cred->username ?? null,
        ]);
    }

    /**
     * Guarda o actualiza las credenciales Siesa (cifradas) del usuario.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'username' => 'required|string|max:190',
            'password' => 'required|string|max:190',
            'domain' => 'nullable|string|max:190',
        ]);

        $cred = SiesaCredential::updateOrCreate(
            ['user_id' => $request->user()->id],
            [
                'username' => $validated['username'],
                'password' => $validated['password'],
                'domain' => $validated['domain'] ?? 'awssiesacloud',
            ]
        );

        return response()->json([
            'message' => 'Credenciales de Siesa guardadas',
            'has_credentials' => true,
            'domain' => $cred->domain,
            'username' => $cred->username,
        ]);
    }

    /**
     * Elimina las credenciales Siesa del usuario.
     */
    public function destroy(Request $request): JsonResponse
    {
        SiesaCredential::where('user_id', $request->user()->id)->delete();

        return response()->json(['message' => 'Credenciales de Siesa eliminadas', 'has_credentials' => false]);
    }

    /**
     * Devuelve las credenciales descifradas para que la extensión del navegador
     * autocomplete el login de Siesa. Requiere el token del propio usuario.
     * Si no existen, responde 404 y la extensión no hace nada (login manual).
     */
    public function reveal(Request $request): JsonResponse
    {
        $cred = SiesaCredential::where('user_id', $request->user()->id)->first();

        abort_unless((bool) $cred, Response::HTTP_NOT_FOUND, 'Sin credenciales de Siesa');

        return response()->json([
            'domain' => $cred->domain,
            'username' => $cred->username,
            'password' => $cred->password,
        ]);
    }

    /**
     * Entrega los datos necesarios para que la Suite arme el "blob" del cliente
     * HTML5 de Siesa (Ericom AccessNow) y abra la sesión ya autenticada, sin
     * escribir credenciales y sin extensión. El cliente de Siesa lee estos
     * valores desde window.name; aquí solo devolvemos las piezas.
     */
    public function launch(Request $request): JsonResponse
    {
        $cred = SiesaCredential::where('user_id', $request->user()->id)->first();

        abort_unless((bool) $cred, Response::HTTP_NOT_FOUND, 'Sin credenciales de Siesa');

        return response()->json([
            'username' => $cred->username,
            'password' => $cred->password,
            'domain' => $cred->domain ?: 'awssiesacloud',
            // Configuración estándar del gateway (is_standard = true).
            'server' => '127.0.0.1',
            'port' => '20444',
            'lang' => 'as_browser',
            'html5_url' => 'https://carnesantacruzapp.siesacloud.com/software/html5.html',
            'return_url' => 'https://carnesantacruzapp.siesacloud.com/',
            'login_url' => 'https://carnesantacruzapp.siesacloud.com/',
        ]);
    }
}
