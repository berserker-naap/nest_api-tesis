# API Tesis

API NestJS para autenticacion, finanzas, mensajeria, asistente y analitica.

## Instalacion

```bash
npm install
```

## Entornos

Desarrollo carga un unico archivo local: `.env`. Crea ese archivo a partir de
`.env.example`. Los secretos y credenciales locales deben permanecer en `.env`,
que esta ignorado por Git.

```bash
# Desarrollo con recarga
npm run dev

# Compilar en modo desarrollo
npm run build:dev

# Compilar y ejecutar como produccion
npm run prod
```

`DB_SYNCHRONIZE=true` solo se admite en desarrollo cuando `DB_HOST` apunta a
`localhost`, `127.0.0.1` o `::1`.

Produccion ignora el archivo `.env` y obtiene su configuracion directamente de
Azure App Settings. Usa los nombres documentados en `.env.example`, asignando
los valores productivos en Azure. En produccion, `DB_SYNCHRONIZE` siempre se
fuerza a `false`.

Para WhatsApp, tanto en desarrollo como en produccion debes usar siempre
credenciales productivas: `WHATSAPP_ACCESS_TOKEN`,
`WHATSAPP_PHONE_NUMBER_ID` y `WHATSAPP_VERIFY_TOKEN`. El proyecto ya no admite
`WHATSAPP_TEST_MODE` ni `WHATSAPP_TEST_PHONE_NUMBER`.

Los endpoints `/integrations/whatsapp/test/*` solo quedan disponibles fuera de
produccion, pero usan el mismo envio real de WhatsApp configurado en variables.

## Validacion

```bash
npm run build:dev
npm run build:prod
npm run test -- --runInBand
```

## Despliegue

El workflow `.github/workflows/main_api-tesisunt.yml` se ejecuta con cada push a
`main`. Instala dependencias, compila en modo produccion, ejecuta las pruebas y
despliega el artefacto en Azure App Service.

Los scripts SQL de `scripts/` se ejecutan por separado; el pipeline no modifica
automaticamente el esquema de Azure SQL.
