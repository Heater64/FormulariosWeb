#!/usr/bin/env node
/**
 * Gate operativo. Sin --strict muestra el estado; con --strict falla si falta
 * evidencia externa. No crea proveedores ni modifica DNS/backups.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { promises as dns } from 'node:dns';

const strict = process.argv.includes('--strict');
const failures = [];
const checks = [];
const check = (condition, label) => {
  const passed = Boolean(condition);
  checks.push(passed);
  console.log(`${passed ? 'PASS' : (strict ? 'FAIL' : 'WARN')}  ${label}`);
  if (!passed && strict) failures.push(label);
};

const required = (name) => process.env[name] || '';
const publicUrl = required('FB_PUBLIC_BASE_URL');
check(!publicUrl || /^https:\/\//i.test(publicUrl), 'Dominio publico usa HTTPS');

if (process.env.FB_HEALTH_URL) {
  try {
    const response = await fetch(process.env.FB_HEALTH_URL, { signal: AbortSignal.timeout(5000) });
    check(response.ok, `Health endpoint responde correctamente (${response.status})`);
    const body = await response.json().catch(() => ({}));
    check(body.status === 'ok', `Health reporta estado ok (${body.status || 'sin estado'})`);
  } catch (error) {
    check(false, `Health endpoint accesible (${error.message})`);
  }
} else {
  check(false, 'FB_HEALTH_URL configurada');
}

check(Boolean(required('FB_SUPPORT_EMAIL') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(required('FB_SUPPORT_EMAIL'))), 'Correo operativo de soporte definido');
check(Boolean(required('FB_SMTP_PROVIDER')), 'Proveedor SMTP definido');
check(process.env.FB_SMTP_VERIFIED === 'true', 'SMTP probado: confirmacion/recuperacion/reenvio');

const evidencePath = required('FB_BACKUP_EVIDENCE_PATH');
if (evidencePath && existsSync(resolve(evidencePath))) {
  let evidence = {};
  try { evidence = JSON.parse(readFileSync(resolve(evidencePath), 'utf8')); } catch {}
  check(evidence.backup_created === true, 'Evidencia: backup creado');
  check(evidence.restore_verified === true, 'Evidencia: restauracion verificada');
  check(Number.isFinite(evidence.rpo_minutes), 'Evidencia: RPO registrado');
  check(Number.isFinite(evidence.rto_minutes), 'Evidencia: RTO registrado');
} else {
  check(false, 'Evidencia de backup/restauracion disponible');
}

check(process.env.FB_LEGAL_APPROVED === 'true', 'Revision legal aprobada por responsable');

const domain = required('FB_DNS_DOMAIN');
if (domain) {
  try {
    const addresses = await dns.resolve(domain);
    check(addresses.length > 0, `DNS A/AAAA resuelve ${domain}`);
  } catch {
    check(false, `DNS A/AAAA resuelve ${domain}`);
  }
  try {
    const txt = (await dns.resolveTxt(domain)).flat().join(' ');
    check(/v=spf1/i.test(txt), `SPF publicado en ${domain}`);
  } catch {
    check(false, `SPF publicado en ${domain}`);
  }
  try {
    const dmarc = (await dns.resolveTxt(`_dmarc.${domain}`)).flat().join(' ');
    check(/v=DMARC1/i.test(dmarc), `DMARC publicado en _dmarc.${domain}`);
  } catch {
    check(false, `DMARC publicado en _dmarc.${domain}`);
  }
  if (process.env.FB_DKIM_SELECTOR) {
    try {
      const dkim = (await dns.resolveTxt(`${process.env.FB_DKIM_SELECTOR}._domainkey.${domain}`)).flat().join(' ');
      check(Boolean(dkim), `DKIM publicado para selector ${process.env.FB_DKIM_SELECTOR}`);
    } catch {
      check(false, `DKIM publicado para selector ${process.env.FB_DKIM_SELECTOR}`);
    }
  } else {
    check(false, 'Selector DKIM definido');
  }
} else {
  check(false, 'FB_DNS_DOMAIN configurado');
}

const total = checks.length;
console.log(`=== Operational gate: ${checks.filter(Boolean).length}/${total}${strict ? ' (strict)' : ' (informativo)'} ===`);
if (failures.length) {
  console.error('Bloqueadores operativos:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
