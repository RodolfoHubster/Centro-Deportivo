-- ============================================================================
-- Integridad del registro de Pausas Activas
-- Fecha: 2026-08-25
--
-- Problema que resuelve:
--   El registro a una pausa activa no pedia ninguna identidad (solo evento,
--   facultad, carrera y sexo). Cualquiera podia registrarse tantas veces como
--   quisiera hasta llenar el cupo, y no habia manera de distinguir un grupo
--   real de una sola persona repitiendo. De 241 registros historicos, 0 tenian
--   identidad: la columna usuario_id existia pero nunca se llenaba.
--
-- Que hace:
--   1. Agrega 'matricula' y un indice UNICO (evento_id, matricula). La base
--      misma rechaza el segundo intento del mismo alumno en el mismo evento.
--   2. Agrega 'ip' y 'user_agent' para poder AUDITAR despues (no bloquean).
--
-- Sobre los registros que ya existen:
--   Se quedan con matricula NULL. MySQL permite varios NULL en un indice
--   unico, asi que no chocan entre si ni impiden crear el indice.
--
-- Es idempotente: se puede correr dos veces sin romper nada.
-- ============================================================================

-- --- 1. Columna de matricula -----------------------------------------------
SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME   = 'inscripcion_pausa_activa'
                  AND COLUMN_NAME  = 'matricula');
SET @sql := IF(@existe = 0,
    'ALTER TABLE inscripcion_pausa_activa ADD COLUMN matricula VARCHAR(15) NULL AFTER usuario_id',
    'SELECT ''matricula ya existe'' AS aviso');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- --- 2. Columnas de auditoria ----------------------------------------------
SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME   = 'inscripcion_pausa_activa'
                  AND COLUMN_NAME  = 'ip');
SET @sql := IF(@existe = 0,
    'ALTER TABLE inscripcion_pausa_activa ADD COLUMN ip VARCHAR(45) NULL, ADD COLUMN user_agent VARCHAR(255) NULL',
    'SELECT ''ip/user_agent ya existen'' AS aviso');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- --- 3. Indice unico: un alumno, un registro por evento ---------------------
SET @existe := (SELECT COUNT(*) FROM information_schema.STATISTICS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME   = 'inscripcion_pausa_activa'
                  AND INDEX_NAME   = 'uq_pausa_evento_matricula');
SET @sql := IF(@existe = 0,
    'CREATE UNIQUE INDEX uq_pausa_evento_matricula ON inscripcion_pausa_activa (evento_id, matricula)',
    'SELECT ''indice unico ya existe'' AS aviso');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- --- Comprobacion final ------------------------------------------------------
SELECT 'listo' AS estado,
       (SELECT COUNT(*) FROM inscripcion_pausa_activa) AS registros_totales,
       (SELECT COUNT(matricula) FROM inscripcion_pausa_activa) AS con_matricula;
