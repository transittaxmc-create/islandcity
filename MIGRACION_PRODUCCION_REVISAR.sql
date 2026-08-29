/* ============================================================
   MIGRACIÓN DE OWNERSHIP PARA PRODUCCIÓN: neondb
   Solo esquema y verificaciones SELECT.
   No contiene operaciones de datos.
   ============================================================ */


/* ============================================================
   PASO 0 — IDENTIDAD Y PRECHEQUEO DEL ENTORNO
   Ejecutar primero y confirmar que database_name = neondb.
   ============================================================ */

SELECT
  current_database() AS database_name,
  current_schema() AS schema_name;


/* Tablas relevantes que existen actualmente. */

SELECT
  table_schema,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'driver_trips',
    'driver_backups',
    'scanned_documents'
  )
ORDER BY table_name;


/* Columnas actuales de las tablas relevantes. */

SELECT
  table_schema,
  table_name,
  ordinal_position,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'driver_trips',
    'driver_backups',
    'scanned_documents'
  )
ORDER BY table_name, ordinal_position;


/*
  CONDICIÓN DE SEGURIDAD:
  - driver_trips debe aparecer como inexistente en el primer resultado.
  - driver_backups debe existir.
  - scanned_documents debe existir.
  - Si aparece una estructura inesperada, detenerse antes de continuar.
*/


/* ============================================================
   PASO 1 — VERIFICACIÓN DE DATOS ANTES DE CREAR driver_trips
   ============================================================ */

SELECT
  to_regclass('public.driver_trips') AS driver_trips_before;

SELECT
  COUNT(*) AS backups_before_create,
  md5(
    COALESCE(
      string_agg(
        concat_ws(
          '|',
          id::text,
          saved_at::text,
          trips::text,
          expenses::text,
          hours_log::text,
          settings::text,
          trip_count::text,
          expense_count::text
        ),
        '||' ORDER BY id
      ),
      ''
    )
  ) AS backups_fingerprint_before_create
FROM public.driver_backups;

SELECT
  COUNT(*) AS documents_before_create,
  md5(
    COALESCE(
      string_agg(
        concat_ws(
          '|',
          id::text,
          type,
          object_path,
          file_date::text,
          category,
          vendor,
          amount::text,
          metadata::text,
          created_at::text
        ),
        '||' ORDER BY id
      ),
      ''
    )
  ) AS documents_fingerprint_before_create
FROM public.scanned_documents;


/*
  En el estado confirmado:
  - driver_trips_before debe ser NULL.
  - backups_before_create debe ser 48.
  - documents_before_create debe ser 1.
*/


/* ============================================================
   PASO 2 — CREAR driver_trips VACÍA
   No se insertan trips.
   ============================================================ */

CREATE TABLE IF NOT EXISTS public.driver_trips (
  id text PRIMARY KEY,
  trip jsonb NOT NULL,
  source text NOT NULL DEFAULT 'web',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);


/* ============================================================
   PASO 3 — VERIFICACIÓN DESPUÉS DE CREAR driver_trips
   ============================================================ */

SELECT
  to_regclass('public.driver_trips') AS driver_trips_after;

SELECT
  COUNT(*) AS trips_after_create
FROM public.driver_trips;

SELECT
  COUNT(*) AS backups_after_create,
  md5(
    COALESCE(
      string_agg(
        concat_ws(
          '|',
          id::text,
          saved_at::text,
          trips::text,
          expenses::text,
          hours_log::text,
          settings::text,
          trip_count::text,
          expense_count::text
        ),
        '||' ORDER BY id
      ),
      ''
    )
  ) AS backups_fingerprint_after_create
FROM public.driver_backups;

SELECT
  COUNT(*) AS documents_after_create,
  md5(
    COALESCE(
      string_agg(
        concat_ws(
          '|',
          id::text,
          type,
          object_path,
          file_date::text,
          category,
          vendor,
          amount::text,
          metadata::text,
          created_at::text
        ),
        '||' ORDER BY id
      ),
      ''
    )
  ) AS documents_fingerprint_after_create
FROM public.scanned_documents;


/*
  Verificación esperada:
  - driver_trips_after debe ser public.driver_trips.
  - trips_after_create debe ser 0.
  - backups_after_create debe ser 48.
  - documents_after_create debe ser 1.
  - Las huellas de backups y documentos deben coincidir con las
    huellas obtenidas antes de este cambio.
*/


/* ============================================================
   PASO 4 — VERIFICACIÓN ANTES DE AGREGAR user_id A backups
   ============================================================ */

SELECT
  COUNT(*) AS backups_before_user_id,
  md5(
    COALESCE(
      string_agg(
        concat_ws(
          '|',
          id::text,
          saved_at::text,
          trips::text,
          expenses::text,
          hours_log::text,
          settings::text,
          trip_count::text,
          expense_count::text
        ),
        '||' ORDER BY id
      ),
      ''
    )
  ) AS backups_fingerprint_before_user_id
FROM public.driver_backups;


/* ============================================================
   PASO 5 — AGREGAR user_id NULLABLE A driver_backups
   ============================================================ */

ALTER TABLE public.driver_backups
  ADD COLUMN IF NOT EXISTS user_id text;


/* ============================================================
   PASO 6 — VERIFICACIÓN DESPUÉS DE AGREGAR user_id A backups
   ============================================================ */

SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'driver_backups'
  AND column_name = 'user_id';

SELECT
  COUNT(*) AS backups_after_user_id,
  COUNT(*) FILTER (WHERE user_id IS NULL) AS backups_without_owner,
  md5(
    COALESCE(
      string_agg(
        concat_ws(
          '|',
          id::text,
          saved_at::text,
          trips::text,
          expenses::text,
          hours_log::text,
          settings::text,
          trip_count::text,
          expense_count::text
        ),
        '||' ORDER BY id
      ),
      ''
    )
  ) AS backups_fingerprint_after_user_id
FROM public.driver_backups;


/*
  Verificación esperada:
  - backups_after_user_id = 48.
  - backups_without_owner = 48.
  - La huella antes/después debe coincidir.
*/


/* ============================================================
   PASO 7 — VERIFICACIÓN ANTES DE AGREGAR user_id A documentos
   ============================================================ */

SELECT
  COUNT(*) AS documents_before_user_id,
  md5(
    COALESCE(
      string_agg(
        concat_ws(
          '|',
          id::text,
          type,
          object_path,
          file_date::text,
          category,
          vendor,
          amount::text,
          metadata::text,
          created_at::text
        ),
        '||' ORDER BY id
      ),
      ''
    )
  ) AS documents_fingerprint_before_user_id
FROM public.scanned_documents;


/* ============================================================
   PASO 8 — AGREGAR user_id NULLABLE A scanned_documents
   ============================================================ */

ALTER TABLE public.scanned_documents
  ADD COLUMN IF NOT EXISTS user_id text;


/* ============================================================
   PASO 9 — VERIFICACIÓN DESPUÉS DE AGREGAR user_id A documentos
   ============================================================ */

SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'scanned_documents'
  AND column_name = 'user_id';

SELECT
  COUNT(*) AS documents_after_user_id,
  COUNT(*) FILTER (WHERE user_id IS NULL) AS documents_without_owner,
  md5(
    COALESCE(
      string_agg(
        concat_ws(
          '|',
          id::text,
          type,
          object_path,
          file_date::text,
          category,
          vendor,
          amount::text,
          metadata::text,
          created_at::text
        ),
        '||' ORDER BY id
      ),
      ''
    )
  ) AS documents_fingerprint_after_user_id
FROM public.scanned_documents;


/*
  Verificación esperada:
  - documents_after_user_id = 1.
  - documents_without_owner = 1.
  - La huella antes/después debe coincidir.
*/


/* ============================================================
   PASO 10 — VERIFICACIÓN DE ÍNDICES ANTES DE CREARLOS
   ============================================================ */

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'driver_trips_user_id_idx',
    'driver_backups_user_id_saved_at_idx',
    'scanned_documents_user_id_created_at_idx'
  )
ORDER BY indexname;


/* ============================================================
   PASO 11 — ÍNDICE DE AISLAMIENTO PARA driver_trips
   ============================================================ */

CREATE INDEX IF NOT EXISTS driver_trips_user_id_idx
  ON public.driver_trips (user_id);


/* ============================================================
   PASO 12 — VERIFICACIÓN DEL ÍNDICE DE driver_trips
   ============================================================ */

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname = 'driver_trips_user_id_idx';


/* ============================================================
   PASO 13 — ÍNDICE DE AISLAMIENTO PARA driver_backups
   ============================================================ */

CREATE INDEX IF NOT EXISTS driver_backups_user_id_saved_at_idx
  ON public.driver_backups (user_id, saved_at);


/* ============================================================
   PASO 14 — VERIFICACIÓN DEL ÍNDICE DE driver_backups
   ============================================================ */

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname = 'driver_backups_user_id_saved_at_idx';


/* ============================================================
   PASO 15 — ÍNDICE DE AISLAMIENTO PARA scanned_documents
   ============================================================ */

CREATE INDEX IF NOT EXISTS scanned_documents_user_id_created_at_idx
  ON public.scanned_documents (user_id, created_at);


/* ============================================================
   PASO 16 — VERIFICACIÓN DEL ÍNDICE DE scanned_documents
   ============================================================ */

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname = 'scanned_documents_user_id_created_at_idx';


/* ============================================================
   PASO 17 — AUDITORÍA FINAL DE SOLO LECTURA
   ============================================================ */

SELECT
  current_database() AS database_name,
  current_schema() AS schema_name;

SELECT
  to_regclass('public.driver_trips') AS driver_trips_final,
  to_regclass('public.driver_backups') AS driver_backups_final,
  to_regclass('public.scanned_documents') AS scanned_documents_final;

SELECT
  COUNT(*) AS trips_final
FROM public.driver_trips;

SELECT
  COUNT(*) AS backups_final,
  COUNT(*) FILTER (WHERE user_id IS NULL) AS backups_in_quarantine,
  md5(
    COALESCE(
      string_agg(
        concat_ws(
          '|',
          id::text,
          saved_at::text,
          trips::text,
          expenses::text,
          hours_log::text,
          settings::text,
          trip_count::text,
          expense_count::text
        ),
        '||' ORDER BY id
      ),
      ''
    )
  ) AS backups_final_fingerprint
FROM public.driver_backups;

SELECT
  COUNT(*) AS documents_final,
  COUNT(*) FILTER (WHERE user_id IS NULL) AS documents_in_quarantine,
  md5(
    COALESCE(
      string_agg(
        concat_ws(
          '|',
          id::text,
          type,
          object_path,
          file_date::text,
          category,
          vendor,
          amount::text,
          metadata::text,
          created_at::text
        ),
        '||' ORDER BY id
      ),
      ''
    )
  ) AS documents_final_fingerprint
FROM public.scanned_documents;

SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'driver_trips',
    'driver_backups',
    'scanned_documents'
  )
  AND column_name = 'user_id'
ORDER BY table_name;

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'driver_trips_user_id_idx',
    'driver_backups_user_id_saved_at_idx',
    'scanned_documents_user_id_created_at_idx'
  )
ORDER BY indexname;