/**
 * @file NoMolestarModule.kt
 * @proyecto most.
 * @descripcion Módulo nativo de Android para el modo enfoque (RF-14, CP-15). Con el permiso
 *   especial «Acceso a No molestar» (ACCESS_NOTIFICATION_POLICY), lee y cambia el filtro de
 *   interrupciones del sistema para activar No Molestar durante la sesión y restaurar el estado
 *   anterior al terminar. Sin permiso no cambia nada. En iOS no existe (no se permite).
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

package expo.modules.nomolestar

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NoMolestarModule : Module() {
  private val contexto: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val gestor: NotificationManager
    get() = contexto.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  override fun definition() = ModuleDefinition {
    Name("NoMolestar")

    // ¿La persona otorgó «Acceso a No molestar» a most.?
    Function("tienePermiso") {
      return@Function gestor.isNotificationPolicyAccessGranted
    }

    // Filtro actual (1 = todo, 2 = prioridad, 3 = nada, 4 = alarmas).
    Function("filtroActual") {
      return@Function gestor.currentInterruptionFilter
    }

    // Cambia el filtro; devuelve false si no hay permiso (no intenta nada).
    Function("ponerFiltro") { filtro: Int ->
      if (!gestor.isNotificationPolicyAccessGranted) {
        return@Function false
      }
      gestor.setInterruptionFilter(filtro)
      return@Function true
    }

    // Abre la pantalla del sistema donde se otorga el permiso.
    Function("abrirAjustePermiso") {
      val intento = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)
      intento.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      contexto.startActivity(intento)
    }
  }
}
