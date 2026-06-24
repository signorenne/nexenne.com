---
title: "Header guards vs pragma once"
lang: it
date: 2024-04-24
desc: "Confronto tra header guards e pragma once, con vantaggi e limiti di entrambe le soluzioni."
read: "4 min"
tags: ["C++"]
categories: ["Programmazione", "Analisi"]
image: "/blog/covers/header_guards_vs_pragma_once.jpeg"
---
## Introduzione
Durante lo sviluppo di Enne 2D Engine mi sono chiesto più volte perché continuassi a usare gli header guard quando avrei potuto scrivere semplicemente `#pragma once`.

Ho quindi confrontato le due soluzioni, i loro vantaggi e i rispettivi limiti.

## Perché serve proteggere i file di dichiarazione? {#perché-serve-proteggere-i-file-di-dichiarazione}

### Principio ODR
La One Definition Rule è una regola fondamentale del C++.

In forma semplificata, stabilisce che una funzione, una variabile o un tipo debbano rispettare precisi vincoli sul numero di definizioni presenti nel programma.

Violare il principio ODR può causare errori di "multiple definitions" in compilazione o problemi in fase di linking, quando il linker non riesce a stabilire quale definizione usare.

Nell'esempio seguente, con tre file definiti, la compilazione fallisce a causa di una definizione multipla di `struct foo`.

File alpha.hpp

```cpp
struct foo {};
```

File bravo.hpp

```cpp
#include "alpha.hpp"
```

File charlie.hpp

```cpp
#include "alpha.hpp"
#include "bravo.hpp"
```

Il preprocessore, terminate le opportune sostituzioni, restituisce il seguente risultato.

```cpp
struct foo {};
struct foo {};
```

Come facciamo quindi a rispettare l'ODR?

La prima soluzione che viene in mente, anche se molto spartana, è gestire manualmente la gerarchia delle direttive `#include`.
Nell'esempio precedente dovremmo evitare l'inclusione di `alpha.hpp` in `charlie.hpp`.
È una tecnica fragile e non scala su progetti medio-grandi.

Esistono due soluzioni comuni:

- Header guards.
- Direttiva #pragma once.

## Header guards
La soluzione prevista dallo standard consiste nell'uso degli header guard.
Queste protezioni impediscono che un header venga incluso più di una volta nella stessa unità di compilazione.
Per ottenere questo risultato utilizzano le macro del preprocessore per verificare se l'intestazione è già stata inclusa in precedenza.
Nel caso in cui fosse già stata inclusa, queste clausole impediscono una successiva reinclusione.

Il #define crea una macro, ovvero l'associazione di un identificatore o un identificatore con parametri con una stringa di token.
Dopo che la macro è stata definita, il compilatore può sostituire la stringa di token per ogni occorrenza dell'identificatore presente nel file di origine.

Riprendendo l'esempio precedente, con poche modifiche otteniamo:

File alpha.hpp

```cpp
#ifndef ALPHA_HPP
#define ALPHA_HPP

struct foo {};

#endif // ALPHA_HPP
```

File bravo.hpp

```cpp
#ifndef BRAVO_HPP
#define BRAVO_HPP

#include "alpha.hpp"

#endif // BRAVO_HPP
```

File charlie.hpp

```cpp
#ifndef CHARLIE_HPP
#define CHARLIE_HPP

#include "alpha.hpp"
#include "bravo.hpp"

#endif // CHARLIE_HPP
```

Il preprocessore terminate le opportune sostituzioni, restituisce il seguente risultato.

```cpp
struct foo {};
```

Quando si lavora su progetti grandi, è importante definire linee guida chiare per il nome della macro: usare solo il nome del file può portare facilmente a conflitti. Altri problemi nascono quando si copia un header e ci si dimentica di aggiornare la macro, oppure quando manca la direttiva `#endif`.
Per questo è utile affidarsi anche a strumenti come clang-tidy.

Io ad esempio per definire il nome di una macro seguo questo schema `<PROJECT_ROOT>_<RELATIVE_PATH_TO_HPP_FILE>_<FILE_NAME>_HPP_`.

Questo schema evita che due file con lo stesso nome producano lo stesso identificatore.

Supponiamo di avere la seguente struttura, con root directory `CPP_PROJECT`, e due file con lo stesso nome in directory diverse.

```txt
.
├── libfoo
│   ├── CMakeLists.txt
│   ├── docs
│   │   └── CMakeLists.txt
│   ├── include
│   │   └── libfoo
│   │       ├── detail
│   │       │   └── alpha.hpp
│   │       └── common
│   │           └── alpha.hpp
```

Il nome della macro sul file `alpha.hpp` nella directory detail sarà:

```cpp
#define CPP_PROJECT_LIBFOO_INCLUDE_LIBFOO_DETAIL_ALPHA_HPP_
```

Il nome della macro sul file `alpha.hpp` nella directory common sarà:

```cpp
#define CPP_PROJECT_LIBFOO_INCLUDE_LIBFOO_COMMON_ALPHA_HPP_
```

## Pragma once
L'alternativa agli header guard, molto diffusa anche se non parte dello standard C++, è la direttiva `#pragma once`.

File alpha.hpp

```cpp
#pragma once

struct foo {};
```

File bravo.hpp

```cpp
#pragma once

#include "alpha.hpp"
```

File charlie.hpp

```cpp
#pragma once

#include "alpha.hpp"
#include "bravo.hpp"
```

Il preprocessore terminate le opportune sostituzioni, restituisce il seguente risultato.

```cpp
struct foo {};
```

Si scrive meno codice e si eliminano i possibili conflitti tra i nomi delle macro. Questa soluzione, però, non offre soltanto vantaggi.

Non proprio: questa direttiva non fa parte dello standard, quindi i compilatori non sono obbligati da ISO C++ a supportarla.

Ma perché non fa parte dello standard?

La risposta è nella complessità che un compilatore affronta per rilevare correttamente e coerentemente l'uguaglianza dei file.
Uno dei problemi noti riguarda l'identificazione dello stesso file attraverso percorsi o collegamenti simbolici diversi. In alcuni casi il compilatore potrebbe non riconoscere che si tratta dello stesso header e includerlo più volte. Si veda <https://en.m.wikipedia.org/wiki/Pragma_once#Caveats>.

Non vi è, poi, garanzia che il supporto di #pragma once sia lo stesso tra i diversi compilatori, il che può essere un problema per alcuni sviluppatori.

## Header guards o pragma once?
Dipende dal caso.

La scelta dipende dai requisiti di portabilità e dalle convenzioni del progetto.

Gli header guard sono standard e funzionano ovunque, a costo di qualche riga in più e di una convenzione affidabile per le macro. `#pragma once` è più conciso ed è supportato dai compilatori più diffusi, ma non fa parte dello standard.

## Conclusione
Nei progetti in cui la portabilità è prioritaria preferisco gli header guard. In contesti con una toolchain ben definita, `#pragma once` resta comunque una scelta pragmatica e ampiamente supportata.
