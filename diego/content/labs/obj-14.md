---
objective: 14
title: "Lab: la misma skill inline vs con `context: fork`"
minutes: 40
needs: ["Claude Code en Windows", "PowerShell", "Git for Windows", "VS Code o Notepad"]
sources:
  - url: https://code.claude.com/docs/en/skills
    title: "Extend Claude with skills"
  - url: https://code.claude.com/docs/en/sub-agents
    title: "Create custom subagents"
status: verificada
---

## Objetivo

Ver con tus ojos qué cambia `context: fork`: el subagente **no ve** tu conversación, su trabajo **no ensucia** tu contexto, y `agent: Explore` arranca **sin** CLAUDE.md.

## Pasos

1. Armá la carpeta de prueba en PowerShell:

```powershell
New-Item -ItemType Directory -Force $HOME\lab-fork | Out-Null
Set-Location $HOME\lab-fork
git init
New-Item -ItemType Directory -Force .claude\skills\eco-inline, .claude\skills\eco-fork, src | Out-Null
1..30 | ForEach-Object { Set-Content -Encoding utf8 -Path "src\mod$_.ts" -Value "export const v$_ = $_;" }
Set-Content -Encoding utf8 -Path CLAUDE.md -Value 'Regla del proyecto: la palabra clave del repo es PINGÜINO.'
(Get-ChildItem src).Count
```

El último comando tiene que dar `30`. Los dos `SKILL.md` creálos con el editor (`code` o `notepad`), no desde la terminal: el `---` de apertura tiene que ser la primera línea del archivo, y en PowerShell 5.1 `Set-Content` o `>` pueden meter un BOM o UTF-16 adelante.

2. Skill **inline** (sin fork). Abrí `code .claude\skills\eco-inline\SKILL.md` y pegá:

```markdown
---
name: eco-inline
description: Reporta la palabra secreta de la charla y cuenta archivos .ts
disable-model-invocation: true
---
1. Si en esta conversación el usuario dijo una "palabra secreta", repetila. Si no la ves, decí "NO LA VEO".
2. Si conocés una "palabra clave del repo", repetila. Si no, decí "SIN PALABRA CLAVE".
3. Leé todos los archivos de src/ y devolvé cuántos son.
```

3. Skill **con fork**. Abrí `code .claude\skills\eco-fork\SKILL.md` y pegá el MISMO cuerpo con este frontmatter:

```markdown
---
name: eco-fork
description: Igual que eco-inline pero en un subagente aislado
disable-model-invocation: true
context: fork
agent: Explore
background: false
---
```

(Pegá debajo los mismos 3 pasos.)

4. Desde PowerShell, parado en `$HOME\lab-fork`, corré `claude` y escribí:

```text
Mi palabra secreta es MANDARINA. No hagas nada más.
```

5. Corré `/eco-inline`. Anotá: ¿dijo MANDARINA? ¿dijo PINGÜINO? Mirá cuánto creció la conversación (las 30 lecturas quedaron a la vista). Podés usar `/context` para ver el uso de contexto.

6. Corré `/eco-fork`. Anotá las mismas dos cosas.

7. Rompelo a propósito: en `.claude\skills\eco-fork\SKILL.md` agregá una línea de comentario **arriba** del `---` de apertura (por ejemplo `<!-- v2 -->`). Corré `/eco-fork` otra vez. Después sacá la línea.

8. Rompelo de nuevo: borrá el cuerpo de pasos de `eco-fork` (en el editor) y dejá solo "Usá nombres de variables en camelCase." Corré `/eco-fork`. Restaurá el cuerpo.

9. Cambiá `agent: Explore` por `agent: general-purpose` y corré `/eco-fork` una vez más.

## Cómo sabés que salió bien

| Corrida | ¿MANDARINA? | ¿PINGÜINO? | Por qué |
| :- | :- | :- | :- |
| `/eco-inline` (paso 5) | Sí | Sí | Corre en tu conversación, con tu historial y CLAUDE.md |
| `/eco-fork` con Explore (paso 6) | No | No | El fork no ve el historial; Explore arranca sin CLAUDE.md |
| `---` no en la primera línea (paso 7) | Sí | Sí | El frontmatter no se lee: corre inline como cualquier skill |
| Solo guías, sin tarea (paso 8) | — | — | Vuelve sin resultado útil: no tenía nada que hacer |
| `general-purpose` (paso 9) | No | Sí | Sigue sin historial, pero general-purpose sí carga CLAUDE.md |

Además, en el paso 6 tu conversación recibe solo el resumen final, no las 30 lecturas.

## Si algo falla

- `/eco-fork` no aparece en el menú `/`: revisá que el archivo se llame exactamente `SKILL.md` dentro de `.claude\skills\eco-fork\`. Con `Get-ChildItem .claude\skills -Recurse` lo ves; si Notepad lo guardó como `SKILL.md.txt`, renombralo con `Rename-Item .claude\skills\eco-fork\SKILL.md.txt SKILL.md`.
- PINGÜINO sale mal escrito (`PINGÃœINO`): el `CLAUDE.md` quedó con otra codificación. Abrilo con `code CLAUDE.md`, corregí la palabra y guardá como UTF-8.
- El fork no devuelve nada y seguís trabajando: sin `background: false`, el resultado llega cuando termina, en segundo plano. Dejá `background: false` para este lab.
- Si en el paso 9 no aparece PINGÜINO, revisá que `CLAUDE.md` esté en la raíz del proyecto y que no tengas `omitClaudeMd` en ningún agente custom con ese nombre.
