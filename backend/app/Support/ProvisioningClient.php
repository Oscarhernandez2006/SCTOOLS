<?php

namespace App\Support;

use App\Models\Application;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Cliente HTTP server-to-server hacia la API de aprovisionamiento de las apps
 * externas (SIGCOM, SIGCOMPRO). Autentica con el secreto compartido SSO.
 *
 * La suite es la fuente de verdad de identidad; este cliente refleja los
 * cambios (usuarios, estado, contraseña, permisos) en la BD de cada app.
 */
class ProvisioningClient
{
    /** ¿La aplicación expone la API de aprovisionamiento y tiene SSO? */
    public function isProvisionable(Application $application): bool
    {
        $apps = (array) config('services.provisioning.apps', []);

        return $application->sso_enabled
            && in_array($application->slug, $apps, true)
            && $this->baseUrl($application) !== null;
    }

    /** Base del backend de la app (sin barra final), o null si no está configurada. */
    public function baseUrl(Application $application): ?string
    {
        $configured = config('services.provisioning.base_urls.' . $application->slug);
        $base = $configured ?: $application->url;

        if (! $base) {
            return null;
        }

        return rtrim((string) $base, '/');
    }

    /** Catálogo de roles y módulos que expone la app (para la UI de la suite). */
    public function catalog(Application $application): ?array
    {
        $res = $this->request($application)?->get($this->endpoint($application, '/catalogo'));

        if (! $res || ! $res->successful()) {
            return null;
        }

        return $res->json();
    }

    /** Lista los usuarios existentes en la app (para importarlos a la suite). */
    public function listUsers(Application $application): ?array
    {
        $res = $this->request($application)?->get($this->endpoint($application, '/usuarios'));

        if (! $res || ! $res->successful()) {
            return null;
        }

        $json = $res->json();

        return is_array($json) ? $json : null;
    }

    /**
     * Trae un usuario de la app por cédula, normalizado (soporta las dos formas:
     * {rol,permisos,cedula} de SIGCOMPRO y {role,permissions,documentId} de SIGCOM).
     * Devuelve null si no existe allá (404) o si la app no responde.
     */
    public function getUser(Application $application, string $cedula): ?array
    {
        $res = $this->request($application)?->get(
            $this->endpoint($application, '/usuarios/' . rawurlencode($cedula))
        );

        if (! $res || ! $res->successful()) {
            return null;
        }

        $json = $res->json();
        if (! is_array($json)) {
            return null;
        }

        return [
            'cedula' => $json['cedula'] ?? $json['documentId'] ?? $cedula,
            'nombre' => $json['nombre'] ?? $json['name'] ?? null,
            'email' => $json['email'] ?? null,
            'rol' => $json['rol'] ?? $json['role'] ?? null,
            'activo' => $json['activo'] ?? $json['active'] ?? true,
            'permisos' => $json['permisos'] ?? $json['permissions'] ?? [],
            'companies' => $json['companies'] ?? [],
        ];
    }

    /** Crea o actualiza (upsert por cédula) un usuario en la app. */
    public function upsertUser(Application $application, array $payload): bool
    {
        return $this->send($application, 'post', '/usuarios', $payload);
    }

    /** Activa/desactiva y bloquea/desbloquea al usuario en la app. */
    public function setEstado(Application $application, string $cedula, ?bool $activo, ?bool $bloqueadoSuite): bool
    {
        return $this->send($application, 'patch', '/usuarios/' . rawurlencode($cedula) . '/estado', array_filter([
            'activo' => $activo,
            'bloqueadoSuite' => $bloqueadoSuite,
        ], fn ($v) => $v !== null));
    }

    /** Restablece la contraseña del usuario en la app. */
    public function setPassword(Application $application, string $cedula, string $password): bool
    {
        return $this->send($application, 'patch', '/usuarios/' . rawurlencode($cedula) . '/password', [
            'password' => $password,
        ]);
    }

    /** Define rol y/o módulos (permisos) del usuario en la app. */
    public function setPermisos(Application $application, string $cedula, ?string $rol, ?array $permisos): bool
    {
        return $this->send($application, 'patch', '/usuarios/' . rawurlencode($cedula) . '/permisos', array_filter([
            'rol' => $rol,
            'permisos' => $permisos,
        ], fn ($v) => $v !== null));
    }

    /** Define los módulos del usuario en una compañía específica (apps multi-compañía). */
    public function setCompanyPermisos(Application $application, string $cedula, string $companyId, array $permisos): bool
    {
        return $this->send($application, 'patch', '/usuarios/' . rawurlencode($cedula) . '/company-permisos', [
            'companyId' => $companyId,
            'permisos' => $permisos,
        ]);
    }

    /** Ejecuta una petición y registra fallos sin lanzar (no debe romper la suite). */
    private function send(Application $application, string $method, string $path, array $body): bool
    {
        $client = $this->request($application);
        if (! $client) {
            return false;
        }

        try {
            $res = $client->{$method}($this->endpoint($application, $path), $body);
            if (! $res->successful()) {
                Log::warning('Aprovisionamiento falló', [
                    'app' => $application->slug,
                    'path' => $path,
                    'status' => $res->status(),
                    'body' => $res->body(),
                ]);

                return false;
            }

            return true;
        } catch (\Throwable $e) {
            Log::warning('Aprovisionamiento inaccesible', [
                'app' => $application->slug,
                'path' => $path,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    private function request(Application $application): ?PendingRequest
    {
        $secret = config('services.sso.shared_secret');
        if (empty($secret) || $this->baseUrl($application) === null) {
            return null;
        }

        return Http::withHeaders(['X-SSO-Secret' => (string) $secret])
            ->acceptJson()
            ->timeout((int) config('services.provisioning.timeout', 8));
    }

    private function endpoint(Application $application, string $path): string
    {
        return $this->baseUrl($application) . '/api/provisioning' . $path;
    }
}
