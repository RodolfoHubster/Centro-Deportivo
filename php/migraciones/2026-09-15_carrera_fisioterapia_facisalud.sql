-- ============================================================================
-- Alta de la Licenciatura en Fisioterapia (FACISALUD, Valle de las Palmas)
-- Fecha: 2026-09-15
--
-- Por que:
--   La carrera no existia en el catalogo, asi que los alumnos de Fisioterapia
--   no podian seleccionarla al inscribirse ni aparecian correctamente en los
--   reportes. La UABC la incorporo a su oferta educativa en el periodo 2024-2,
--   impartida en la Facultad de Ciencias de la Salud, Unidad Valle de las
--   Palmas (facultad_id = 17, FACISALUD).
--   Referencia: https://facisalud.tij.uabc.mx/
--
-- Se sigue la convencion del catalogo: el nombre es el titulo que se otorga
-- ("Licenciado en ..."), igual que "Licenciado en Enfermeria" y
-- "Licenciado en Psicologia" de la misma facultad. El id lo asigna MySQL.
--
-- Es idempotente: si ya se cargo, no la duplica.
-- ============================================================================

INSERT INTO carrera (nombre, codigo, facultad_id, es_tronco_comun, area_tronco_comun)
SELECT 'Licenciado en Fisioterapia', NULL, 17, 0, NULL
WHERE NOT EXISTS (
    SELECT 1 FROM carrera WHERE nombre = 'Licenciado en Fisioterapia' AND facultad_id = 17
);

-- Comprobacion
SELECT id, nombre, facultad_id
FROM carrera
WHERE facultad_id = 17
ORDER BY nombre;
