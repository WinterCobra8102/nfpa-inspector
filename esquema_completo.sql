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






CREATE OR REPLACE FUNCTION "public"."admin_create_user"("p_client_id" "uuid", "p_email" "text", "p_full_name" "text", "p_password" "text", "p_role" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    new_user_id uuid;
    encrypted_pw text;
BEGIN
    -- Encriptar la contraseña
    encrypted_pw := crypt(p_password, gen_salt('bf'));

    -- Insertar el usuario en auth.users
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    )
    VALUES (
        '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', p_email, encrypted_pw, now(),
        now(), now(), jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
        jsonb_build_object('full_name', p_full_name, 'role', p_role, 'client_id', p_client_id),
        now(), now(), '', '', '', '' -- Asegurarse de que estas columnas no sean NULL
    )
    RETURNING id INTO new_user_id;

    -- Insertar los datos adicionales en la tabla public.profiles
    INSERT INTO public.profiles (id, full_name, role, client_id)
    VALUES (new_user_id, p_full_name, p_role, p_client_id);

    RETURN new_user_id;
END;
$$;


ALTER FUNCTION "public"."admin_create_user"("p_client_id" "uuid", "p_email" "text", "p_full_name" "text", "p_password" "text", "p_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_delete_user"("target_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;


ALTER FUNCTION "public"."admin_delete_user"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_update_user"("new_email" "text", "new_name" "text", "new_password" "text", "new_role" "text", "target_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'extensions'
    AS $$
BEGIN
    -- 1. Actualizar el correo electrónico si se proporciona uno nuevo
    IF new_email IS NOT NULL AND new_email <> '' THEN
        UPDATE auth.users SET email = new_email WHERE id = target_user_id;
        -- También actualizar la identidad para evitar problemas de inicio de sesión
        UPDATE auth.identities 
        SET provider_id = new_email, 
            identity_data = jsonb_set(identity_data, 
                                      ARRAY['email'], 
                                      to_jsonb(new_email), 
                                      true)
        WHERE user_id = target_user_id;
    END IF;

    -- 2. Actualizar la contraseña si se proporciona una nueva
    IF new_password IS NOT NULL AND new_password <> '' THEN
        UPDATE auth.users
        SET encrypted_password = crypt(new_password, gen_salt('bf')) -- gen_salt ahora será encontrado
        WHERE id = target_user_id;
    END IF;

    -- 3. Actualizar los metadatos del usuario en auth.users (nombre y rol)
    UPDATE auth.users
    SET 
        raw_app_meta_data = jsonb_set(COALESCE(raw_app_meta_data, '{}'::jsonb), ARRAY['role'], to_jsonb(new_role), true),
        raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), ARRAY['full_name'], to_jsonb(new_name), true)
    WHERE id = target_user_id;

    -- 4. Actualizar los datos en la tabla public.profiles (nombre y rol)
    UPDATE public.profiles
    SET 
        full_name = new_name,
        role = new_role
    WHERE id = target_user_id;

END;
$$;


ALTER FUNCTION "public"."admin_update_user"("new_email" "text", "new_name" "text", "new_password" "text", "new_role" "text", "target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_update_user"("new_email" "text", "new_name" "text", "new_password" "text", "new_role" "text", "new_phone" "text", "target_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
    -- 1. Actualizar el correo electrónico si se proporciona uno nuevo
    IF new_email IS NOT NULL AND new_email <> '' THEN
        UPDATE auth.users SET email = new_email WHERE id = target_user_id;
        -- También actualizar la identidad para evitar problemas de inicio de sesión
        UPDATE auth.identities 
        SET provider_id = new_email, 
            identity_data = jsonb_set(identity_data, 
                                      ARRAY["email"], 
                                      to_jsonb(new_email), 
                                      true)
        WHERE user_id = target_user_id;
    END IF;

    -- 2. Actualizar la contraseña si se proporciona una nueva
    IF new_password IS NOT NULL AND new_password <> '' THEN
        UPDATE auth.users
        SET encrypted_password = crypt(new_password, gen_salt("bf"))
        WHERE id = target_user_id;
    END IF;

    -- 3. Actualizar los metadatos del usuario en auth.users (nombre y rol)
    UPDATE auth.users
    SET 
        raw_app_meta_data = jsonb_set(COALESCE(raw_app_meta_data, '{}'::jsonb), ARRAY["role"], to_jsonb(new_role), true),
        raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), ARRAY["full_name"], to_jsonb(new_name), true)
    WHERE id = target_user_id;

    -- 4. Actualizar los datos en la tabla public.profiles (nombre, rol y teléfono)
    UPDATE public.profiles
    SET 
        full_name = new_name,
        role = new_role,
        phone = new_phone
    WHERE id = target_user_id;

END;
$$;


ALTER FUNCTION "public"."admin_update_user"("new_email" "text", "new_name" "text", "new_password" "text", "new_role" "text", "new_phone" "text", "target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  _es_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'
  ) INTO _es_admin;
  RETURN COALESCE(_es_admin, false);
END;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_room_member"("p_room_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE room_id = p_room_id AND user_id = p_user_id
  );
END;
$$;


ALTER FUNCTION "public"."is_room_member"("p_room_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_chat_room_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.chat_rooms SET updated_at = now() WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_chat_room_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."chat_messages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "room_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "is_system_message" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."chat_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_participants" (
    "room_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_read_at" timestamp with time zone
);


ALTER TABLE "public"."chat_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_rooms" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "type" character varying(10) NOT NULL,
    "client_id" "uuid",
    "name" character varying(255),
    "status" character varying(20) DEFAULT 'OPEN'::character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."chat_rooms" OWNER TO "postgres";


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
    "email" "text",
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


ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_participants"
    ADD CONSTRAINT "chat_participants_pkey" PRIMARY KEY ("room_id", "user_id");



ALTER TABLE ONLY "public"."chat_rooms"
    ADD CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("id");



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



CREATE OR REPLACE TRIGGER "update_chat_room_updated_at_trigger" AFTER INSERT ON "public"."chat_messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_chat_room_updated_at"();



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."chat_rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_participants"
    ADD CONSTRAINT "chat_participants_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."chat_rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_participants"
    ADD CONSTRAINT "chat_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_rooms"
    ADD CONSTRAINT "chat_rooms_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clientes"("id") ON DELETE CASCADE;



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



CREATE POLICY "Acceso a Reportes por Jerarquía" ON "public"."inspections" TO "authenticated" USING ((((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'ADMIN'::"text") OR (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'MANAGER'::"text") AND ("client_id" IN ( SELECT "profiles"."client_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))) OR (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'STAFF'::"text") AND ("assigned_to" = "auth"."uid"()))));



CREATE POLICY "Acceso por Jerarquía Clientes" ON "public"."clientes" TO "authenticated" USING ((((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'ADMIN'::"text") OR ("id" IN ( SELECT "profiles"."client_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "Actualizacion de tareas IPM" ON "public"."ipm_tasks" FOR UPDATE USING ((("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'ADMIN'::"text"))) OR (("tecnico_id")::"text" = ("auth"."uid"())::"text")));



CREATE POLICY "Admins actualizan solicitudes" ON "public"."service_requests" FOR UPDATE USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'ADMIN'::"text"))));



CREATE POLICY "Admins control total de perfiles" ON "public"."profiles" TO "authenticated" USING (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'ADMIN'::"text"));



CREATE POLICY "Admins ven todo" ON "public"."service_requests" FOR SELECT USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'ADMIN'::"text"))));



CREATE POLICY "Borrado solo para administradores" ON "public"."clientes" FOR DELETE TO "authenticated" USING (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'ADMIN'::"text"));



CREATE POLICY "Clientes crean solicitudes" ON "public"."service_requests" FOR INSERT WITH CHECK (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'CLIENTE'::"text"))));



CREATE POLICY "Clientes ven sus solicitudes" ON "public"."service_requests" FOR SELECT USING (("client_id" IN ( SELECT "profiles"."client_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Inserción solo para administradores" ON "public"."clientes" FOR INSERT TO "authenticated" WITH CHECK (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'ADMIN'::"text"));



CREATE POLICY "Lectura para todos los inspectores" ON "public"."clientes" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Permitir todo a usuarios autenticados" ON "public"."pump_tests" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Permitir usuarios leer su propio perfil" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Técnicos actualizan progreso" ON "public"."service_requests" FOR UPDATE USING (("tecnico_id" = "auth"."uid"()));



CREATE POLICY "Técnicos ven lo asignado" ON "public"."service_requests" FOR SELECT USING (("tecnico_id" = "auth"."uid"()));



CREATE POLICY "Visibilidad de tareas IPM por Rol" ON "public"."ipm_tasks" FOR SELECT USING ((("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'ADMIN'::"text"))) OR (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'MANAGER'::"text"))) AND ("client_id" IN ( SELECT "profiles"."client_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))) OR ("tecnico_id" = "auth"."uid"())));



CREATE POLICY "admin_delete_rooms" ON "public"."chat_rooms" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'ADMIN'::"text")))));



ALTER TABLE "public"."chat_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_rooms" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "insert_messages" ON "public"."chat_messages" FOR INSERT WITH CHECK (("sender_id" = "auth"."uid"()));



CREATE POLICY "insert_participants_v2" ON "public"."chat_participants" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "insert_rooms_v2" ON "public"."chat_rooms" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "update_rooms" ON "public"."chat_rooms" FOR UPDATE USING (true);



CREATE POLICY "view_messages_v3" ON "public"."chat_messages" FOR SELECT USING (("public"."is_room_member"("room_id", "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'ADMIN'::"text"))))));



CREATE POLICY "view_participants_v3" ON "public"."chat_participants" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."is_room_member"("room_id", "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'ADMIN'::"text"))))));



CREATE POLICY "view_rooms_v3" ON "public"."chat_rooms" FOR SELECT USING (("public"."is_room_member"("id", "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'ADMIN'::"text"))))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."chat_messages";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."chat_participants";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."chat_rooms";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."profiles";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."service_requests";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "authenticator";






















































































































































GRANT ALL ON FUNCTION "public"."admin_create_user"("p_client_id" "uuid", "p_email" "text", "p_full_name" "text", "p_password" "text", "p_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_create_user"("p_client_id" "uuid", "p_email" "text", "p_full_name" "text", "p_password" "text", "p_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_create_user"("p_client_id" "uuid", "p_email" "text", "p_full_name" "text", "p_password" "text", "p_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_delete_user"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_delete_user"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_delete_user"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_update_user"("new_email" "text", "new_name" "text", "new_password" "text", "new_role" "text", "target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_update_user"("new_email" "text", "new_name" "text", "new_password" "text", "new_role" "text", "target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_update_user"("new_email" "text", "new_name" "text", "new_password" "text", "new_role" "text", "target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_update_user"("new_email" "text", "new_name" "text", "new_password" "text", "new_role" "text", "new_phone" "text", "target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_update_user"("new_email" "text", "new_name" "text", "new_password" "text", "new_role" "text", "new_phone" "text", "target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_update_user"("new_email" "text", "new_name" "text", "new_password" "text", "new_role" "text", "new_phone" "text", "target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_room_member"("p_room_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_room_member"("p_room_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_room_member"("p_room_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_chat_room_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_chat_room_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_chat_room_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."chat_participants" TO "anon";
GRANT ALL ON TABLE "public"."chat_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_participants" TO "service_role";



GRANT ALL ON TABLE "public"."chat_rooms" TO "anon";
GRANT ALL ON TABLE "public"."chat_rooms" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_rooms" TO "service_role";



GRANT ALL ON TABLE "public"."clientes" TO "anon";
GRANT ALL ON TABLE "public"."clientes" TO "authenticated";
GRANT ALL ON TABLE "public"."clientes" TO "service_role";



GRANT ALL ON TABLE "public"."inspections" TO "anon";
GRANT ALL ON TABLE "public"."inspections" TO "authenticated";
GRANT ALL ON TABLE "public"."inspections" TO "service_role";



GRANT ALL ON TABLE "public"."ipm_tasks" TO "anon";
GRANT ALL ON TABLE "public"."ipm_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."ipm_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



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































