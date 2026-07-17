SET NOCOUNT ON;
SET XACT_ABORT ON;

/*
  Limpieza total de usuarios y datos asociados en SQL Server.

  Uso:
  1) Ejecuta primero con @ExecuteDelete = 0 para ver el impacto
  2) Si el resumen es correcto, cambia @ExecuteDelete = 1

  El script elimina:
  - USUARIO, PROFILE, PROFILE_PHONE, RENIEC_DATA
  - OTP, roles, assistant chat
  - logs de email/push/whatsapp/error
  - datos financieros asociados al usuario

  No elimina catálogos maestros/sistema:
  - ROL
  - MULTITABLA
  - MESSAGING_CAMPAIGN
  - otras tablas maestras sin idUsuario
*/

DECLARE @ExecuteDelete BIT = 0;

IF OBJECT_ID('tempdb..#UsuariosObjetivo') IS NOT NULL DROP TABLE #UsuariosObjetivo;
IF OBJECT_ID('tempdb..#ProfilesObjetivo') IS NOT NULL DROP TABLE #ProfilesObjetivo;
IF OBJECT_ID('tempdb..#ReniecObjetivo') IS NOT NULL DROP TABLE #ReniecObjetivo;

SELECT DISTINCT
  U.id AS idUsuario,
  U.idProfile
INTO #UsuariosObjetivo
FROM USUARIO U;

SELECT DISTINCT
  P.id AS idProfile,
  P.idReniecData
INTO #ProfilesObjetivo
FROM PROFILE P
WHERE P.id IN (
  SELECT UO.idProfile
  FROM #UsuariosObjetivo UO
  WHERE UO.idProfile IS NOT NULL
);

SELECT DISTINCT
  PO.idReniecData
INTO #ReniecObjetivo
FROM #ProfilesObjetivo PO
WHERE PO.idReniecData IS NOT NULL;

PRINT 'Resumen de registros a eliminar';

DECLARE @Resumen TABLE (
  tabla NVARCHAR(128) NOT NULL,
  cantidad INT NOT NULL
);

INSERT INTO @Resumen (tabla, cantidad)
SELECT N'ASSISTANT_MESSAGE', COUNT(*)
FROM ASSISTANT_MESSAGE
WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo)
   OR idSession IN (
      SELECT S.id
      FROM ASSISTANT_SESSION S
      WHERE S.idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo)
   );

INSERT INTO @Resumen (tabla, cantidad)
SELECT N'ASSISTANT_SESSION', COUNT(*)
FROM ASSISTANT_SESSION
WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo);

INSERT INTO @Resumen (tabla, cantidad)
SELECT N'OTP_VERIFICACION', COUNT(*)
FROM OTP_VERIFICACION
WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo);

INSERT INTO @Resumen (tabla, cantidad)
SELECT N'USUARIO_ROL', COUNT(*)
FROM USUARIO_ROL
WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo);

INSERT INTO @Resumen (tabla, cantidad)
SELECT N'MESSAGING_CAMPAIGN_READ', COUNT(*)
FROM MESSAGING_CAMPAIGN_READ
WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo);

INSERT INTO @Resumen (tabla, cantidad)
SELECT N'PUSH_INSTALLATION', COUNT(*)
FROM PUSH_INSTALLATION
WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo);

INSERT INTO @Resumen (tabla, cantidad)
SELECT N'PUSH_NOTIFICATION_LOG', COUNT(*)
FROM PUSH_NOTIFICATION_LOG
WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo);

INSERT INTO @Resumen (tabla, cantidad)
SELECT N'EMAIL_MESSAGE_LOG', COUNT(*)
FROM EMAIL_MESSAGE_LOG
WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo);

INSERT INTO @Resumen (tabla, cantidad)
SELECT N'WHATSAPP_MESSAGE_LOG', COUNT(*)
FROM WHATSAPP_MESSAGE_LOG
WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo);

INSERT INTO @Resumen (tabla, cantidad)
SELECT N'SERVICE_ERROR_LOG', COUNT(*)
FROM SERVICE_ERROR_LOG
WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo);

INSERT INTO @Resumen (tabla, cantidad)
SELECT N'PRESUPUESTO_CATEGORIA', COUNT(*)
FROM PRESUPUESTO_CATEGORIA
WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo);

INSERT INTO @Resumen (tabla, cantidad)
SELECT N'PAGO_RECURRENTE', COUNT(*)
FROM PAGO_RECURRENTE
WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo);

INSERT INTO @Resumen (tabla, cantidad)
SELECT N'META_AHORRO', COUNT(*)
FROM META_AHORRO
WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo);

INSERT INTO @Resumen (tabla, cantidad)
SELECT N'TRANSACCION', COUNT(*)
FROM TRANSACCION
WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo);

INSERT INTO @Resumen (tabla, cantidad)
SELECT N'CUENTA', COUNT(*)
FROM CUENTA
WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo);

INSERT INTO @Resumen (tabla, cantidad)
SELECT N'SUBCATEGORIA_FINANCE', COUNT(*)
FROM SUBCATEGORIA_FINANCE
WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo);

INSERT INTO @Resumen (tabla, cantidad)
SELECT N'CATEGORIA_FINANCE', COUNT(*)
FROM CATEGORIA_FINANCE
WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo);

INSERT INTO @Resumen (tabla, cantidad)
SELECT N'TIPO_CUENTA', COUNT(*)
FROM TIPO_CUENTA
WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo);

INSERT INTO @Resumen (tabla, cantidad)
SELECT N'ENTIDAD_FINANCIERA', COUNT(*)
FROM ENTIDAD_FINANCIERA
WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo);

INSERT INTO @Resumen (tabla, cantidad)
SELECT N'MONEDA', COUNT(*)
FROM MONEDA
WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo);

INSERT INTO @Resumen (tabla, cantidad)
SELECT N'PROFILE_PHONE', COUNT(*)
FROM PROFILE_PHONE
WHERE idProfile IN (SELECT idProfile FROM #ProfilesObjetivo);

INSERT INTO @Resumen (tabla, cantidad)
SELECT N'USUARIO', COUNT(*)
FROM USUARIO
WHERE id IN (SELECT idUsuario FROM #UsuariosObjetivo);

INSERT INTO @Resumen (tabla, cantidad)
SELECT N'PROFILE', COUNT(*)
FROM PROFILE
WHERE id IN (SELECT idProfile FROM #ProfilesObjetivo);

INSERT INTO @Resumen (tabla, cantidad)
SELECT N'RENIEC_DATA', COUNT(*)
FROM RENIEC_DATA
WHERE id IN (SELECT idReniecData FROM #ReniecObjetivo);

SELECT tabla, cantidad
FROM @Resumen
WHERE cantidad > 0
ORDER BY tabla;

SELECT
  totalUsuarios = COUNT(*),
  totalProfiles = (SELECT COUNT(*) FROM #ProfilesObjetivo),
  totalReniec = (SELECT COUNT(*) FROM #ReniecObjetivo)
FROM #UsuariosObjetivo;

IF @ExecuteDelete = 0
BEGIN
  PRINT 'Modo simulacion: no se elimino nada. Cambia @ExecuteDelete = 1 para ejecutar.';
  RETURN;
END;

BEGIN TRANSACTION;

BEGIN TRY
  DELETE FROM ASSISTANT_MESSAGE
  WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo)
     OR idSession IN (
        SELECT S.id
        FROM ASSISTANT_SESSION S
        WHERE S.idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo)
     );

  DELETE FROM ASSISTANT_SESSION
  WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo);

  DELETE FROM OTP_VERIFICACION
  WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo);

  DELETE FROM USUARIO_ROL
  WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo);

  DELETE FROM MESSAGING_CAMPAIGN_READ
  WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo);

  DELETE FROM PUSH_INSTALLATION
  WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo);

  DELETE FROM PUSH_NOTIFICATION_LOG
  WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo);

  DELETE FROM EMAIL_MESSAGE_LOG
  WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo);

  DELETE FROM WHATSAPP_MESSAGE_LOG
  WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo);

  DELETE FROM SERVICE_ERROR_LOG
  WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo);

  DELETE FROM PRESUPUESTO_CATEGORIA
  WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo);

  DELETE FROM PAGO_RECURRENTE
  WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo);

  DELETE FROM META_AHORRO
  WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo);

  DELETE FROM TRANSACCION
  WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo);

  DELETE FROM CUENTA
  WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo);

  DELETE FROM SUBCATEGORIA_FINANCE
  WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo);

  DELETE FROM CATEGORIA_FINANCE
  WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo);

  DELETE FROM TIPO_CUENTA
  WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo);

  DELETE FROM ENTIDAD_FINANCIERA
  WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo);

  DELETE FROM MONEDA
  WHERE idUsuario IN (SELECT idUsuario FROM #UsuariosObjetivo);

  DELETE FROM PROFILE_PHONE
  WHERE idProfile IN (SELECT idProfile FROM #ProfilesObjetivo);

  DELETE FROM USUARIO
  WHERE id IN (SELECT idUsuario FROM #UsuariosObjetivo);

  DELETE FROM PROFILE
  WHERE id IN (SELECT idProfile FROM #ProfilesObjetivo);

  DELETE FROM RENIEC_DATA
  WHERE id IN (SELECT idReniecData FROM #ReniecObjetivo);

  COMMIT TRANSACTION;
  PRINT 'Limpieza total de usuarios completada correctamente.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0
    ROLLBACK TRANSACTION;

  DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
  DECLARE @ErrorLine INT = ERROR_LINE();

  RAISERROR('Fallo cleanup_all_usuarios.sql en linea %d: %s', 16, 1, @ErrorLine, @ErrorMessage);
END CATCH;
