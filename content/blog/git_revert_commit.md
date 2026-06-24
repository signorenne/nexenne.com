---
title: "Annullare l'ultimo commit Git"
lang: it
date: 2024-04-15
desc: "Differenze tra git revert e git reset quando bisogna annullare l'ultimo commit."
read: "1 min"
tags: ["Git", "Control", "Command Line"]
categories: ["Management", "Tutorial"]
image: "/blog/covers/git_revert_commit.png"
---
## Introduzione
Supponiamo di stare lavorando a un progetto con `Git`.
Per errore o distrazione può capitare di creare un commit che non doveva esistere.
In quella situazione bisogna annullarlo nel modo corretto, scegliendo tra due approcci molto diversi.

I comandi principali sono:

- Il comando `revert`
- Il comando `reset`

## Comando revert
Il comando `revert` crea un nuovo commit che annulla le modifiche del commit selezionato.

La forma base è:

```bash
git revert <commit to revert>
```

Vediamo i passaggi.

1.  Lanciare il comando `git log`.
2.  Ricercare il commit che si vuole ripristinare.
3.  Copiare l'hash del commit da annullare.
4.  Usare il comando `git revert <commit to revert>`.

Esempio.

```bash
cd project_with_a_dot_git_folder

git log
### Esempio di stampa post git log
#
# commit 2596f783998c8ec230b38a044b49e39d07770901 (HEAD -> main, origin/main)
# Author: Foo <foo@bar.com>
# Date:   Tue Apr 9 14:47:17 2024 +0200
#
#     Add something bad
#
# commit 2ce5e2e7e36f23673b32ccef7f908f161527142b
# Author: Foo <foo@bar.com>
# Date:   Tue Apr 2 23:33:27 2024 +0200
#
#     Update something

git revert 2ce5e2e7e36f23673b32ccef7f908f161527142b
```

Dopo l'esecuzione viene creato un nuovo commit che applica le modifiche inverse, senza riscrivere la cronologia esistente.

![](/blog/images/git_revert_commit_before_revert.png)

![](/blog/images/git_revert_commit_after_revert.png)

## Comando reset
L'alternativa è il comando `reset`.
`git reset` modifica la cronologia locale e va quindi usato con attenzione, soprattutto se i commit sono già stati condivisi. Il comando sposta `HEAD` al commit indicato; il comportamento dei file e dell'indice dipende dall'opzione scelta.

### Soft reset
L'opzione `--soft` sposta `HEAD` mantenendo nell'indice le modifiche introdotte dai commit rimossi.

```bash
git reset --soft HEAD~1
```

![](/blog/images/fit_revert_commit_before_soft_reset.png)

![](/blog/images/fit_revert_commit_after_soft_reset.png)

### Hard reset
L'opzione `--hard` riallinea indice e directory di lavoro al commit indicato, eliminando anche le modifiche locali non salvate.

```bash
git reset --hard HEAD~1
```

![](/blog/images/git_revert_commit_before_hard_reset.png)

![](/blog/images/git_revert_commit_after_hard_reset.png)

## Conclusione
`git revert` è la scelta più sicura per una cronologia già condivisa, perché aggiunge un nuovo commit senza riscrivere quelli esistenti. `git reset` è utile soprattutto per correggere una cronologia locale, prima che venga pubblicata.
