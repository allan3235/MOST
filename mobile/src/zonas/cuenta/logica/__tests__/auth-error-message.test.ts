import { es } from '@/comun/i18n/es';
import { ErrorApi, ErrorSinRed } from '@/comun/logica/errores';

import { authErrorMessage } from '@/zonas/cuenta/logica/auth-error-message';

jest.mock('@/comun/config/env', () => ({ env: { urlApi: 'http://prueba' } }));

describe('authErrorMessage', () => {
  it('traduce los estados conocidos del backend', () => {
    expect(authErrorMessage(new ErrorApi(401, null, 'x'))).toBe(es.auth.errores.credenciales);
    expect(authErrorMessage(new ErrorApi(409, null, 'x'))).toBe(es.auth.errores.usuarioExiste);
    expect(authErrorMessage(new ErrorApi(429, null, 'x'))).toBe(es.auth.errores.demasiadosIntentos);
  });

  it('reconoce los fallos de red', () => {
    expect(authErrorMessage(new ErrorSinRed())).toBe(es.auth.errores.sinConexion);
  });

  it('nunca muestra el texto técnico', () => {
    expect(authErrorMessage(new ErrorApi(500, null, 'Database error'))).toBe(
      es.comun.errorGenerico,
    );
    expect(authErrorMessage(null)).toBe(es.comun.errorGenerico);
  });
});
