/**
 * @file conCompilacionNativaCorta.js
 * @proyecto most.
 * @descripcion Config plugin solo para Windows: el ninja del CMake del SDK de Android no puede
 *   crear carpetas de más de 248 caracteres, y la compilación de codegen de react-native-gesture-
 *   handler dentro de `app/.cxx` pasa de ese límite. Mueve la carpeta temporal de CMake del módulo
 *   `app` a `C:/mx` (ruta corta). En macOS y Linux (y en EAS) no cambia nada.
 * @autor Allan Sebastian Zepeda Fragoso (con Claude Code)
 * @fecha 2026-11-23
 * @version 1.0.0
 * @historial 1.0.0 (2026-11-23): creación.
 */

const { withAppBuildGradle } = require('expo/config-plugins');

const MARCA = '// most.: compilación nativa corta en Windows';

const BLOQUE = `
${MARCA}
if (System.getProperty('os.name').toLowerCase().contains('windows')) {
    def unidad = System.getenv('SystemDrive') ?: 'C:'
    android.externalNativeBuild.cmake.buildStagingDirectory = new File("\${unidad}/mx")
}
`;

/**
 * Agrega al final de app/build.gradle la carpeta corta de CMake para Windows.
 * @param {import('expo/config').ExpoConfig} config Configuración de Expo.
 * @returns {import('expo/config').ExpoConfig} La configuración con el cambio registrado.
 */
function conCompilacionNativaCorta(config) {
  return withAppBuildGradle(config, (modificado) => {
    if (!modificado.modResults.contents.includes(MARCA)) {
      modificado.modResults.contents += BLOQUE;
    }
    return modificado;
  });
}

module.exports = conCompilacionNativaCorta;
