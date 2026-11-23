-- most. Fase 3 (RF-15): con menos de 40 % de cumplimiento en los últimos 7 días se propone una
-- meta intermedia (antes: menos de 50 % en 14 días, y bajaba sola). Subir sigue con 85 % en 14 días.
-- Solo cambia la configuración; la app la descarga al sincronizar (app_config).
UPDATE public.app_config
SET valor = valor || '{"umbral_bajar": 0.4, "ventana_dias_bajar": 7}'::jsonb
WHERE clave = 'progresion';
