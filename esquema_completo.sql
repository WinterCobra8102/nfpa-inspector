


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."admin_create_user"("email" "text", "password" "text", "full_name" "text", "role" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Generar ID para el nuevo usuario
  new_user_id := gen_random_uuid();

  -- 1. Insertar en auth.users (agregando los tokens vacíos para evitar crashes internos)
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, 
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
    aud, role, created_at, updated_at, is_super_admin,
    confirmation_token, recovery_token, email_change_token_new, email_change_token_current, phone_change_token
  )
  VALUES (
    new_user_id, '00000000-0000-0000-0000-000000000000', email, 
    extensions.crypt(password, extensions.gen_salt('bf')), 
    now(), 
    jsonb_build_object('provider', 'email', 'providers', '["email"]'::jsonb, 'role', role),
    jsonb_build_object('full_name', full_name), 
    'authenticated', 'authenticated', now(), now(), false,
    '', '', '', '', ''
  );

  -- 2. Insertar en auth.identities (ESTO ES LO QUE SOLUCIONA EL ERROR 500)
  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  )
  VALUES (
    gen_random_uuid(), 
    new_user_id, 
    new_user_id::text, -- Supabase exige que el provider_id sea el UUID en formato texto
    jsonb_build_object('sub', new_user_id::text, 'email', email), 
    'email', now(), now(), now()
  );

  -- 3. Insertar en tu tabla pública PROFILES
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new_user_id, full_name, role);

  RETURN new_user_id;
END;
$$;


ALTER FUNCTION "public"."admin_create_user"("email" "text", "password" "text", "full_name" "text", "role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_delete_user"("target_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- 1. Borrar de la tabla pública de perfiles
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- 2. Borrar de la tabla maestra de autenticación
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;


ALTER FUNCTION "public"."admin_delete_user"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_set_role"("target_email" "text", "new_role" "text", "full_name_val" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Buscamos el ID del usuario que la App acaba de crear
  SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

  -- Actualizamos sus metadatos y lo auto-confirmamos
  UPDATE auth.users 
  SET raw_app_meta_data = jsonb_build_object('role', new_role),
      raw_user_meta_data = jsonb_build_object('full_name', full_name_val),
      email_confirmed_at = now()
  WHERE id = target_user_id;

  -- Lo guardamos en tu lista de perfiles
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (target_user_id, full_name_val, new_role)
  ON CONFLICT (id) DO UPDATE 
  SET role = EXCLUDED.role, full_name = EXCLUDED.full_name;
END;
$$;


ALTER FUNCTION "public"."admin_set_role"("target_email" "text", "new_role" "text", "full_name_val" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_update_user"("target_user_id" "uuid", "new_email" "text", "new_name" "text", "new_role" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- 1. Si escribiste un correo nuevo en el formulario, lo actualizamos
  IF new_email <> '' THEN
    UPDATE auth.users SET email = new_email WHERE id = target_user_id;
    -- Actualizamos la identidad para evitar errores de login
    UPDATE auth.identities 
    SET identity_data = jsonb_set(identity_data, '{email}', to_jsonb(new_email)) 
    WHERE user_id = target_user_id;
  END IF;

  -- 2. Actualizamos el Rol en los metadatos de seguridad
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', '["email"]'::jsonb, 'role', new_role),
      raw_user_meta_data = jsonb_build_object('full_name', new_name)
  WHERE id = target_user_id;

  -- 3. Actualizamos la tarjeta visual en tu tabla pública
  UPDATE public.profiles
  SET full_name = new_name, role = new_role
  WHERE id = target_user_id;
END;
$$;


ALTER FUNCTION "public"."admin_update_user"("target_user_id" "uuid", "new_email" "text", "new_name" "text", "new_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_update_user"("target_user_id" "uuid", "new_email" "text", "new_name" "text", "new_role" "text", "new_password" "text" DEFAULT ''::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- 1. Actualizar correo si no está vacío
  IF new_email <> '' THEN
    UPDATE auth.users SET email = new_email WHERE id = target_user_id;
    UPDATE auth.identities 
    SET identity_data = jsonb_set(identity_data, '{email}', to_jsonb(new_email)) 
    WHERE user_id = target_user_id;
  END IF;

  -- 2. 🔥 NUEVO: Actualizar contraseña si se escribió una nueva 🔥
  IF new_password <> '' THEN
    UPDATE auth.users
    SET encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf'))
    WHERE id = target_user_id;
  END IF;

  -- 3. Actualizar metadatos de seguridad
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', '["email"]'::jsonb, 'role', new_role),
      raw_user_meta_data = jsonb_build_object('full_name', new_name)
  WHERE id = target_user_id;

  -- 4. Actualizar tabla pública
  UPDATE public.profiles
  SET full_name = new_name, role = new_role
  WHERE id = target_user_id;
END;
$$;


ALTER FUNCTION "public"."admin_update_user"("target_user_id" "uuid", "new_email" "text", "new_name" "text", "new_role" "text", "new_password" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'STAFF')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Si algo falla, ignora el error y permite entrar al usuario
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."clientes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "direccion" "text",
    "telefono" "text",
    "encargado_nombre" "text",
    "encargado_email" "text",
    "notas_internas" "text",
    "latitude" double precision,
    "longitude" double precision,
    "place_id" "text",
    "is_active" boolean DEFAULT true,
    "latitud" "text",
    "longitud" "text"
);


ALTER TABLE "public"."clientes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inspections" (
    "date" timestamp with time zone DEFAULT "now"(),
    "service_code" "text",
    "equipment_name" "text",
    "norm" "text",
    "overall_status" "text",
    "technician" "text" DEFAULT 'Isai Moo'::"text",
    "observations" "text",
    "location" "jsonb",
    "responses" "jsonb",
    "point_notes" "jsonb",
    "units" "jsonb",
    "photo_url" "text",
    "synced" boolean DEFAULT true,
    "photo" "text",
    "id" "text" NOT NULL,
    "standard" "text",
    "assigned_to" "uuid",
    "client_id" "uuid",
    "category" "text",
    "details" "jsonb",
    "signature" "text",
    "performed_by" "text",
    "owner_name" "text",
    "voltages" "jsonb",
    "form_code" "text",
    "general_obs" "text",
    "client_name" "text",
    "client_address" "text",
    "tech_signature" "text"
);


ALTER TABLE "public"."inspections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ipm_tasks" (
    "id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "system" "text" NOT NULL,
    "frequency" "text" NOT NULL,
    "day_of_week" "text" NOT NULL,
    "semana" "text" NOT NULL,
    "mes" "text" NOT NULL,
    "color_code" "text" NOT NULL,
    "status" "text" DEFAULT 'PENDIENTE'::"text",
    "client_id" "uuid",
    "tecnico_id" "uuid",
    "fecha_programada" "date",
    "notas_tecnico" "text",
    "fecha_realizacion" timestamp with time zone,
    "created_by_role" "text" DEFAULT 'ADMIN'::"text"
);


ALTER TABLE "public"."ipm_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "role" "text",
    "client_id" "uuid",
    "phone" "text",
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['ADMIN'::"text", 'STAFF'::"text", 'MANAGER'::"text", 'CLIENTE'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pump_tests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "test_name" "text" NOT NULL,
    "explanation" "text",
    "rated_gpm" numeric NOT NULL,
    "rated_psi" numeric NOT NULL,
    "churn_suction" numeric NOT NULL,
    "churn_discharge" numeric NOT NULL,
    "rated_suction" numeric NOT NULL,
    "rated_discharge" numeric NOT NULL,
    "predicted_psi" numeric,
    "is_passing" boolean,
    "client_id" "uuid",
    "inspection_id" "text"
);


ALTER TABLE "public"."pump_tests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "client_id" "uuid",
    "requested_by" "uuid",
    "titulo" "text" NOT NULL,
    "descripcion" "text" NOT NULL,
    "status" "text" DEFAULT 'PENDIENTE'::"text",
    "tecnico_id" "uuid",
    "fecha_asignacion" timestamp with time zone,
    "notas_admin" "text",
    CONSTRAINT "service_requests_status_check" CHECK (("status" = ANY (ARRAY['PENDIENTE'::"text", 'ASIGNADO'::"text", 'EN_PROCESO'::"text", 'COMPLETADO'::"text"])))
);


ALTER TABLE "public"."service_requests" OWNER TO "postgres";


ALTER TABLE ONLY "public"."clientes"
    ADD CONSTRAINT "clientes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inspections"
    ADD CONSTRAINT "inspections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ipm_tasks"
    ADD CONSTRAINT "ipm_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pump_tests"
    ADD CONSTRAINT "pump_tests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_requests"
    ADD CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_inspections_assigned_to" ON "public"."inspections" USING "btree" ("assigned_to");



CREATE INDEX "idx_inspections_client_id" ON "public"."inspections" USING "btree" ("client_id");



CREATE INDEX "idx_ipm_tasks_client_id" ON "public"."ipm_tasks" USING "btree" ("client_id");



CREATE INDEX "idx_ipm_tasks_tecnico_id" ON "public"."ipm_tasks" USING "btree" ("tecnico_id");



ALTER TABLE ONLY "public"."inspections"
    ADD CONSTRAINT "inspections_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."inspections"
    ADD CONSTRAINT "inspections_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clientes"("id");



ALTER TABLE ONLY "public"."ipm_tasks"
    ADD CONSTRAINT "ipm_tasks_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ipm_tasks"
    ADD CONSTRAINT "ipm_tasks_tecnico_id_fkey" FOREIGN KEY ("tecnico_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clientes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pump_tests"
    ADD CONSTRAINT "pump_tests_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pump_tests"
    ADD CONSTRAINT "pump_tests_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "public"."inspections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_requests"
    ADD CONSTRAINT "service_requests_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_requests"
    ADD CONSTRAINT "service_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."service_requests"
    ADD CONSTRAINT "service_requests_tecnico_id_fkey" FOREIGN KEY ("tecnico_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



CREATE POLICY "Acceso a Clientes por Rol" ON "public"."clientes" FOR SELECT TO "authenticated" USING ((((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'ADMIN'::"text") OR ("id" IN ( SELECT "profiles"."client_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "Acceso a Reportes por Jerarquía" ON "public"."inspections" TO "authenticated" USING ((((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'ADMIN'::"text") OR (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'MANAGER'::"text") AND ("client_id" IN ( SELECT "profiles"."client_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))) OR (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'STAFF'::"text") AND ("assigned_to" = "auth"."uid"()))));



CREATE POLICY "Acceso por Jerarquía Clientes" ON "public"."clientes" TO "authenticated" USING ((((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'ADMIN'::"text") OR ("id" IN ( SELECT "profiles"."client_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "Actualizacion de tareas IPM" ON "public"."ipm_tasks" FOR UPDATE USING ((("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'ADMIN'::"text"))) OR (("tecnico_id")::"text" = ("auth"."uid"())::"text")));



CREATE POLICY "Admin full access" ON "public"."profiles" TO "authenticated" USING (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'ADMIN'::"text"));



CREATE POLICY "Admins actualizan solicitudes" ON "public"."service_requests" FOR UPDATE USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'ADMIN'::"text"))));



CREATE POLICY "Admins full access" ON "public"."profiles" TO "authenticated" USING (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'ADMIN'::"text"));



CREATE POLICY "Admins ven todo" ON "public"."service_requests" FOR SELECT USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'ADMIN'::"text"))));



CREATE POLICY "Allow authenticated users to read own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Allow users to insert own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Allow users to insert their own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Allow users to read their own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Borrado solo para administradores" ON "public"."clientes" FOR DELETE TO "authenticated" USING (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'ADMIN'::"text"));



CREATE POLICY "Clientes crean solicitudes" ON "public"."service_requests" FOR INSERT WITH CHECK (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'CLIENTE'::"text"))));



CREATE POLICY "Clientes ven sus solicitudes" ON "public"."service_requests" FOR SELECT USING (("client_id" IN ( SELECT "profiles"."client_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Enable read access for all authenticated users" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Inserción solo para administradores" ON "public"."clientes" FOR INSERT TO "authenticated" WITH CHECK (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'ADMIN'::"text"));



CREATE POLICY "Lectura para todos los autenticados" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Lectura para todos los inspectores" ON "public"."clientes" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Permitir lectura a todos los autenticados" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Permitir todo a usuarios autenticados" ON "public"."pump_tests" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Técnicos actualizan progreso" ON "public"."service_requests" FOR UPDATE USING (("tecnico_id" = "auth"."uid"()));



CREATE POLICY "Técnicos ven lo asignado" ON "public"."service_requests" FOR SELECT USING (("tecnico_id" = "auth"."uid"()));



CREATE POLICY "Usuarios ven su propio perfil" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Visibilidad de tareas IPM por Rol" ON "public"."ipm_tasks" FOR SELECT USING ((("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'ADMIN'::"text"))) OR (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'MANAGER'::"text"))) AND ("client_id" IN ( SELECT "profiles"."client_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))) OR ("tecnico_id" = "auth"."uid"())));



ALTER TABLE "public"."clientes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ipm_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pump_tests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_requests" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."profiles";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "authenticator";






















































































































































GRANT ALL ON FUNCTION "public"."admin_create_user"("email" "text", "password" "text", "full_name" "text", "role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_create_user"("email" "text", "password" "text", "full_name" "text", "role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_create_user"("email" "text", "password" "text", "full_name" "text", "role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_delete_user"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_delete_user"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_delete_user"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_set_role"("target_email" "text", "new_role" "text", "full_name_val" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_set_role"("target_email" "text", "new_role" "text", "full_name_val" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_set_role"("target_email" "text", "new_role" "text", "full_name_val" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_update_user"("target_user_id" "uuid", "new_email" "text", "new_name" "text", "new_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_update_user"("target_user_id" "uuid", "new_email" "text", "new_name" "text", "new_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_update_user"("target_user_id" "uuid", "new_email" "text", "new_name" "text", "new_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_update_user"("target_user_id" "uuid", "new_email" "text", "new_name" "text", "new_role" "text", "new_password" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_update_user"("target_user_id" "uuid", "new_email" "text", "new_name" "text", "new_role" "text", "new_password" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_update_user"("target_user_id" "uuid", "new_email" "text", "new_name" "text", "new_role" "text", "new_password" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";


















GRANT ALL ON TABLE "public"."clientes" TO "anon";
GRANT ALL ON TABLE "public"."clientes" TO "authenticated";
GRANT ALL ON TABLE "public"."clientes" TO "service_role";



GRANT ALL ON TABLE "public"."inspections" TO "anon";
GRANT ALL ON TABLE "public"."inspections" TO "authenticated";
GRANT ALL ON TABLE "public"."inspections" TO "service_role";
GRANT ALL ON TABLE "public"."inspections" TO "authenticator";



GRANT ALL ON TABLE "public"."ipm_tasks" TO "anon";
GRANT ALL ON TABLE "public"."ipm_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."ipm_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";
GRANT ALL ON TABLE "public"."profiles" TO "authenticator";



GRANT ALL ON TABLE "public"."pump_tests" TO "anon";
GRANT ALL ON TABLE "public"."pump_tests" TO "authenticated";
GRANT ALL ON TABLE "public"."pump_tests" TO "service_role";



GRANT ALL ON TABLE "public"."service_requests" TO "anon";
GRANT ALL ON TABLE "public"."service_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."service_requests" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































