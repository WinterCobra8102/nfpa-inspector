import { supabase } from '@/supabaseClient'

export async function createUserAdmin(email, password, fullName, role) {
  try {
    // Crea el usuario en auth
    const { data, error } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: role
      }
    })

    if (error) throw error

    // Crea el perfil
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        full_name: fullName,
        role: role
      })

    if (profileError) throw profileError

    return { 
      success: true, 
      userId: data.user.id,
      message: `Usuario ${email} creado exitosamente`
    }
  } catch (error) {
    return { 
      success: false, 
      error: error.message 
    }
  }
}