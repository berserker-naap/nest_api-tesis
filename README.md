# API Tesis

API NestJS para autenticacion, finanzas, mensajeria, asistente y analitica.

## Instalacion

```bash
npm install
```

## Entornos

Scripts locales:

- `npm run start:dev` carga `.env`
- `npm run build:dev` carga `.env`
- `npm run build:prod` carga `.env.production`
- `npm run build:main` no carga ningun archivo `.env` y usa solo variables del entorno
- `npm run start:prod` carga `.env.production`
- `npm run start:main` no carga ningun archivo `.env` y usa solo variables del entorno

Crea esos archivos locales a partir de `.env.example`. Los secretos y
credenciales locales deben permanecer en esos archivos, que estan ignorados por
Git.

```bash
# Desarrollo con recarga usando `.env`
npm run dev

# Compilar usando `.env`
npm run build:dev

# Compilar usando `.env.production`
npm run build:prod

# Compilar sin `.env`, pensado para Azure App Settings
npm run build:main

# Ejecutar localmente como produccion usando `.env.production`
npm run start:prod

# Ejecutar sin `.env`, pensado para Azure App Settings
npm run start:main
```

`DB_SYNCHRONIZE=true` solo se admite en desarrollo cuando `DB_HOST` apunta a
`localhost`, `127.0.0.1` o `::1`.

`start:main` ignora cualquier archivo `.env` y obtiene su configuracion
directamente de Azure App Settings. Usa los nombres documentados en
`.env.example`, asignando los valores productivos en Azure. En produccion,
`DB_SYNCHRONIZE` siempre se fuerza a `false`.

Los scripts usan `node --env-file` para cargar `.env` o `.env.production`
cuando corresponde. No existe wrapper adicional para cambiar entornos.

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
