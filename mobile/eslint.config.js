const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

// Arquitectura en capas (SRS v4.0, diagrama oficial): cada zona tiene presentacion → logica →
// datos y dispositivo, y las dependencias solo van hacia abajo. Los `import type` se permiten en
// cualquier dirección porque desaparecen al compilar (no crean dependencia en ejecución).
const capa = (nombre) => [`**/${nombre}`, `**/${nombre}/**`];
const prohibir = (capas, mensaje) => ({
  'no-restricted-imports': [
    'error',
    {
      patterns: [{ group: capas.flatMap(capa), allowTypeImports: true, message: mensaje }],
    },
  ],
});

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    ignores: ['dist/*', '.expo/*'],
  },
  {
    // Las rutas de Expo Router son presentación.
    files: ['src/app/**', 'src/**/presentacion/**'],
    rules: prohibir(
      ['datos', 'dispositivo'],
      'Presentación solo usa la capa de lógica (SRS: la lógica es la única que lee datos y usa el dispositivo).',
    ),
  },
  {
    files: ['src/**/logica/**'],
    rules: prohibir(['presentacion'], 'La lógica no depende de la presentación.'),
  },
  {
    files: ['src/**/datos/**'],
    rules: prohibir(
      ['presentacion', 'logica', 'dispositivo'],
      'Datos es la capa de abajo: no depende de lógica, presentación ni dispositivo.',
    ),
  },
  {
    files: ['src/**/dispositivo/**'],
    rules: prohibir(
      ['presentacion', 'logica', 'datos'],
      'Dispositivo es una capa de abajo: no depende de lógica, presentación ni datos.',
    ),
  },
]);
