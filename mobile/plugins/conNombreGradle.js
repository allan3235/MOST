/**
 * @file conNombreGradle.js
 * @proyecto most.
 * @descripcion Config plugin: Gradle no acepta un nombre de proyecto que termine en punto, y el
 *   nombre visible de la app es «most.». Solo cambia `rootProject.name` en settings.gradle a
 *   «most»; el nombre que ve la persona en el teléfono sigue siendo «most.».
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

const { withSettingsGradle } = require('expo/config-plugins');

const NOMBRE_GRADLE = 'most';

/**
 * Corrige el nombre del proyecto de Gradle.
 * @param {import('expo/config').ExpoConfig} config Configuración de Expo.
 * @returns {import('expo/config').ExpoConfig} La configuración con el cambio registrado.
 */
function conNombreGradle(config) {
  return withSettingsGradle(config, (modificado) => {
    modificado.modResults.contents = modificado.modResults.contents.replace(
      /rootProject\.name\s*=\s*['"][^'"]*['"]/,
      `rootProject.name = '${NOMBRE_GRADLE}'`,
    );
    return modificado;
  });
}

module.exports = conNombreGradle;
