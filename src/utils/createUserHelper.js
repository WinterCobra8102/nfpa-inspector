import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

/**
 * Crea un nuevo usuario en el sistema TLETL
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña inicial
 * @param {string} fullName - Nombre completo
 * @param {string} role - Rol (STAFF, MANAGER, ADMIN)
 * @param {string} clientId - ID de la empresa (opcional, requerido si no es ADMIN)
 * @param {string} phone - Teléfono (opcional)
 * @returns {Promise<{success: boolean, userId?: string, error?: string}>}
 */
export async function createUserWithAuth(email, password, fullName, role, clientId = null, phone = null) {
  try {
    // 1️⃣ Crear usuario en Supabase Auth
    console.log('📝 Creando usuario en Auth...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName.toUpperCase(),
        role: role
      }
    });

    if (authError) {
      console.error('❌ Error en Auth:', authError);
      throw new Error(`Error en autenticación: ${authError.message}`);
    }

    const newUserId = authData.user.id;
    console.log('✅ Usuario creado en Auth:', newUserId);

    // 2️⃣ Crear perfil en tabla public.profiles
    console.log('📝 Creando perfil...');
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: newUserId,
        full_name: fullName.toUpperCase(),
        role: role,
        client_id: role === 'ADMIN' ? null : clientId,
        phone: phone || null
      });

    if (profileError) {
      console.error('❌ Error al crear perfil:', profileError);
      // Intentar limpiar el usuario de auth si el perfil falla
      await supabase.auth.admin.deleteUser(newUserId).catch(() => {});
      throw new Error(`Error al crear perfil: ${profileError.message}`);
    }

    console.log('✅ Perfil creado exitosamente');
    return {
      success: true,
      userId: newUserId,
      message: `${fullName.toUpperCase()} registrado correctamente`
    };

  } catch (error) {
    console.error('🔴 Error en createUserWithAuth:', error);
    return {
      success: false,
      error: error.message || 'Error desconocido al crear usuario'
    };
  }
}

/**
 * Intenta crear usuario usando la RPC como fallback
 */
export async function createUserWithRPC(email, password, fullName, role, clientId = null) {
  try {
    console.log('📝 Intentando crear usuario con RPC...');
    
    const { data, error } = await supabase.rpc('admin_create_user', {
      p_email: email.trim().toLowerCase(),
      p_password: password,
      p_full_name: fullName.toUpperCase(),
      p_role: role,
      p_client_id: role === 'ADMIN' ? null : clientId
    });

    if (error) {
      console.error('❌ Error RPC:', error);
      throw error;
    }

    console.log('✅ Usuario creado con RPC:', data);
    return {
      success: true,
      userId: data,
      message: `${fullName.toUpperCase()} registrado correctamente`
    };

  } catch (error) {
    console.error('🔴 Error en RPC:', error);
    return {
      success: false,
      error: error.message || 'Error en RPC'
    };
  }
}

/**
 * Crea usuario con fallback: intenta Auth primero, luego RPC
 */
export async function createUserHybrid(email, password, fullName, role, clientId = null, phone = null) {
  // Intenta primero con Auth (más confiable)
  const authResult = await createUserWithAuth(email, password, fullName, role, clientId, phone);
  
  if (authResult.success) {
    return authResult;
  }

  // Si falla Auth y es ADMIN, intenta con RPC
  if (authResult.error.includes('already') || authResult.error.includes('exists')) {
    return authResult; // No intentes RPC si el email ya existe
  }

  console.log('⚠️ Auth falló, intentando RPC como fallback...');
  return await createUserWithRPC(email, password, fullName, role, clientId);
}