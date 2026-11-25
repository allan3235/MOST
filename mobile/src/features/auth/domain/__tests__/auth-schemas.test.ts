import { es, formatear } from '@/comun/i18n/es';

import { EMAIL_MAX, loginSchema, registerSchema } from '../auth-schemas';

const v = es.auth.validacion;

function firstError(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.error?.issues[0]?.message;
}

describe('loginSchema', () => {
  it('normaliza el correo (espacios y mayúsculas)', () => {
    const result = loginSchema.parse({ email: '  Ana@Ejemplo.COM ', password: 'x' });
    expect(result.email).toBe('ana@ejemplo.com');
  });

  it('pide el correo y la contraseña', () => {
    expect(firstError(loginSchema.safeParse({ email: '', password: 'x' }))).toBe(v.correoRequerido);
    expect(firstError(loginSchema.safeParse({ email: 'a@b.co', password: '' }))).toBe(
      v.contrasenaRequerida,
    );
  });

  it('rechaza un correo mal escrito', () => {
    expect(firstError(loginSchema.safeParse({ email: 'ana@', password: 'x' }))).toBe(
      v.correoInvalido,
    );
  });

  it('acepta hasta 50 caracteres y rechaza más (decisión del usuario)', () => {
    expect(EMAIL_MAX).toBe(50);
    const correo = (n: number) => 'a'.repeat(n - '@correo.com'.length) + '@correo.com';
    expect(loginSchema.safeParse({ email: correo(50), password: 'x' }).success).toBe(true);
    expect(firstError(loginSchema.safeParse({ email: correo(51), password: 'x' }))).toBe(
      formatear(v.correoLargo, { n: 50 }),
    );
  });

  it('rechaza dos «@»', () => {
    expect(firstError(loginSchema.safeParse({ email: 'ana@b@correo.com', password: 'x' }))).toBe(
      v.correoInvalido,
    );
  });
});

describe('registerSchema', () => {
  const valid = { email: 'ana@ejemplo.com', password: 'segura123', confirmPassword: 'segura123' };

  it('acepta datos válidos', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it('exige al menos 8 caracteres', () => {
    const result = registerSchema.safeParse({
      ...valid,
      password: 'corta',
      confirmPassword: 'corta',
    });
    expect(firstError(result)).toBe(v.contrasenaCorta);
  });

  it('marca el error en la confirmación si no coincide', () => {
    const result = registerSchema.safeParse({ ...valid, confirmPassword: 'otra12345' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      message: v.contrasenasDistintas,
      path: ['confirmPassword'],
    });
  });
});
