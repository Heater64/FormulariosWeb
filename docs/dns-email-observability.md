# DNS, correo y observabilidad

## SPF, DKIM y DMARC

Estos registros se publican en el DNS del dominio que se use como remitente. Los valores exactos de SPF y DKIM los entrega el proveedor SMTP; no deben inventarse.

### SPF

Crear un único registro TXT en `@`:

```text
v=spf1 include:PROVEEDOR_SMTP -all
```

Sustituir `PROVEEDOR_SMTP` por el `include:` oficial del proveedor. Si ya existe SPF, fusionar los `include` en el mismo registro; nunca crear dos registros SPF.

### DKIM

El proveedor entregará un selector, por ejemplo `fb2026`, y un valor TXT. Crear:

```text
fb2026._domainkey  TXT  "v=DKIM1; k=rsa; p=CLAVE_PUBLICA_ENTREGADA"
```

No publicar la clave privada ni guardarla en GitHub.

### DMARC inicial

Crear en `_dmarc`:

```text
v=DMARC1; p=none; rua=mailto:dmarc@DOMINIO; adkim=s; aspf=s; pct=100
```

Mantener `p=none` solo durante monitorización. Tras revisar informes y confirmar SPF/DKIM, valorar `quarantine` o `reject` con la persona responsable.

### Verificación

```bash
FB_DNS_DOMAIN=ejemplo.org \
FB_DKIM_SELECTOR=fb2026 \
FB_PUBLIC_BASE_URL=https://ejemplo.org \
FB_HEALTH_URL=https://ejemplo.org/api/health \
npm run test:ops -- --strict
```

La verificación DNS no sustituye el envío real de un correo de confirmación y recuperación desde Supabase staging.

## SMTP de Supabase

1. Configurar el proveedor SMTP en Supabase Auth.
2. Usar un remitente del dominio autenticado.
3. Configurar Site URL y Redirect URLs para `/`, `/recuperar.html` y `/onboarding.html`.
4. Probar confirmación, recuperación, reenvío, enlace caducado y usuario inexistente.
5. Registrar proveedor, fecha, responsable y resultado en la evidencia de release.

No se añade SMTP al frontend: las credenciales viven exclusivamente en Supabase.

## Sentry opcional

El código incorpora una integración opt-in en `js/core/error-capture.js`. Para activarla, cargar el SDK oficial de Sentry con una etiqueta externa permitida por la CSP y definir el DSN público mediante la configuración del despliegue:

```js
window.FB_SENTRY_DSN_PUBLIC = 'https://PUBLIC_KEY@o0.ingest.sentry.io/PROJECT_ID';
```

El DSN es identificador público, no una clave de servidor. No enviar datos personales, tokens ni respuestas de formularios. La captura no se activa sin DSN y nunca debe bloquear el arranque.

No se ejecuta `npx @sentry/ai install` automáticamente: es una herramienta de instalación/agente que puede modificar el proyecto y requiere decisión sobre proveedor, versión y consentimiento. La captura runtime queda preparada sin dependencia obligatoria.

## Health check y alertas

Monitorizar `GET /api/health` cada 1–5 minutos. Alertar después de 2–3 fallos consecutivos y ante latencia elevada. Definir responsable, sustituto, horario y procedimiento de escalado.

## Límites

- SPF, DKIM, DMARC y WAF requieren el dominio y proveedor reales.
- Sentry requiere crear el proyecto y obtener un DSN.
- La revisión legal y la política de retención de errores necesitan aprobación humana.
