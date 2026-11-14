---
objective: 16
title: "¿Dónde va cada regla? CLAUDE.md, rules, Skills, hooks y permisos"
rule: "Si tiene que cumplirse SIEMPRE → hook o permiso; si es un consejo → CLAUDE.md (o rules con paths si es solo para ciertos archivos); si es un procedimiento que usás a veces → Skill."
sources:
  - url: https://code.claude.com/docs/en/memory
    title: "How Claude remembers your project"
  - url: https://code.claude.com/docs/en/settings
    title: "Settings files and precedence"
  - url: https://code.claude.com/docs/en/permissions
    title: "Configure permissions"
  - url: https://code.claude.com/docs/en/hooks-guide
    title: "Automate actions with hooks"
  - url: https://code.claude.com/docs/en/skills
    title: "Extend Claude with skills"
  - url: https://code.claude.com/docs/en/features-overview
    title: "Extend Claude Code"
status: verificada
---

## Qué es

Claude Code tiene cinco lugares donde podés "decirle algo". La diferencia clave es una sola: **¿orienta o garantiza?**

- Lo que va en CLAUDE.md, rules y Skills es **texto que Claude lee**. Lo intenta seguir, pero puede fallar. La doc lo dice así: Claude los trata "as context, not enforced configuration".
- Los hooks y los permisos los ejecuta **Claude Code (el programa)**, no el modelo. Se cumplen aunque Claude "quiera" otra cosa.

| Mecanismo | Qué es | Cuándo se carga / aplica | ¿Garantiza u orienta? |
|---|---|---|---|
| `$HOME\.claude\CLAUDE.md` (user) | Tus preferencias personales | Cada sesión, en todos tus proyectos | Orienta |
| `./CLAUDE.md` o `./.claude/CLAUDE.md` (project) | Estándares del equipo. Se commitea | Cada sesión en ese proyecto | Orienta |
| `./CLAUDE.local.md` (local) | Tus preferencias para ESTE proyecto. Va al `.gitignore` | Cada sesión en ese proyecto, después del `CLAUDE.md` | Orienta |
| `.claude/rules/*.md` con `paths` | Instrucciones para ciertos archivos (globs) | Solo cuando Claude lee/escribe/edita un archivo que matchea | Orienta |
| `.claude/rules/*.md` sin `paths` | Instrucciones partidas por tema | Al arrancar, igual que `.claude/CLAUDE.md` | Orienta |
| Skill (`.claude/skills/<nombre>/SKILL.md`) | Procedimiento o material de referencia reutilizable | La descripción siempre (salvo con `disable-model-invocation: true`: ahí no carga nada hasta que la invocás); el cuerpo solo cuando vos (`/nombre`) o Claude la invocan | Orienta |
| Hook (`hooks` en un `settings.json`) | Comando que corre en un evento (`PreToolUse`, `PostToolUse`…) | Siempre que ocurre el evento y matchea el `matcher` | **Garantiza** (exit 2 bloquea) |
| Permisos (`permissions.allow` / `ask` / `deny`) | Reglas sobre herramientas: `Bash(git push *)`, `PowerShell(git push *)`, `Read(./.env)` | En cada llamada a herramienta. Orden: deny → ask → allow | **Garantiza** |

## Cuándo se usa

- **"Esto se tiene que cumplir siempre"** (compliance, seguridad, "nunca leas `.env`") → `permissions.deny` o un hook `PreToolUse`.
- **"Después de cada edición hay que correr X"** → hook `PostToolUse`. La doc: los hooks "apply regardless of what Claude decides to do".
- **"Solo para los archivos de `src/api/`"** → `.claude/rules/api.md` con `paths: ["src/api/**/*.ts"]`. No ensucia el contexto del resto.
- **"Checklist de release de 12 pasos que uso de vez en cuando"** → Skill. Si tiene efectos (deploy, publicar), agregale `disable-model-invocation: true` para que solo corra cuando vos tipeás `/nombre`.
- **"Comandos de build y convenciones del equipo"** → `CLAUDE.md` de proyecto, commiteado.
- **"Mi URL de sandbox, mis datos de prueba"** → `CLAUDE.local.md` (no se commitea).
- **"Mis gustos en todos los proyectos"** → `$HOME\.claude\CLAUDE.md`.

## El error típico que el examen quiere que cometas

Te muestran a Claude leyendo un archivo prohibido y te ofrecen: "agregá **IMPORTANT: NUNCA** al CLAUDE.md". Suena fuerte, pero sigue siendo texto. El fix es `permissions.deny` (o un hook). Lo mismo al revés: no metas un procedimiento largo en CLAUDE.md "para que lo sepa siempre"; eso gasta contexto en cada request. Va a una Skill.

Segundo error: creer que un `allow` en tu `$HOME\.claude\settings.json` "le gana" a un `deny` del proyecto. No: **si algo está denegado en cualquier nivel, ningún otro nivel lo puede permitir**.

## Ejemplo

Equipo con Next.js. Quieren:

1. "Usá pnpm" → `CLAUDE.md` del proyecto.
2. "Los componentes en `src/components/**/*.tsx` usan el design system" → `.claude/rules/components.md` con `paths`.
3. "Nadie lee `.env`" → en `.claude/settings.json`:

```json
{ "permissions": { "deny": ["Read(./.env)", "Read(./.env.*)"] } }
```

4. "Prettier después de cada edición" → hook `PostToolUse` con `"matcher": "Edit|Write"`.
5. "`/release` con el checklist" → `.claude/skills/release/SKILL.md`.

Ojo con el punto 3: un deny de `Read` cubre las herramientas de archivo de Claude y los comandos de archivo que Claude Code reconoce en Bash, como `cat`, pero no un script de Python que abra el archivo por su cuenta. Para eso la doc recomienda el sandbox. En Windows, la tool `PowerShell` tiene sus propias reglas: sumá `PowerShell(Get-Content *.env*)` al `deny`. Y en Windows con Git Bash, un deny de `Bash` (aun uno acotado como `Bash(git push *)`) apaga la tool PowerShell para toda la sesión, salvo que agregues una regla `PowerShell(...)`, por ejemplo `PowerShell(git push *)`, o fijes `CLAUDE_CODE_USE_POWERSHELL_TOOL=1`.

## Para recordar

- **Orienta**: CLAUDE.md (user / project / local), rules, Skills. **Garantiza**: hooks y permisos.
- `paths` en una regla = "solo cuando toca esos archivos".
- Skill = "a demanda". CLAUDE.md = "siempre en contexto".
- Precedencia de settings: managed > línea de comando > `.claude/settings.local.json` > `.claude/settings.json` > `$HOME\.claude\settings.json`. Pero **deny gana siempre**, venga de donde venga.
- Se commitean: `CLAUDE.md`, `.claude/settings.json`, `.claude/rules/`, `.claude/skills/`. No se commitean: `CLAUDE.local.md`, `.claude/settings.local.json`.
