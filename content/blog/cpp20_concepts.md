---
title: "C++20 Concepts"
lang: it
date: 2024-08-25
desc: "Una spiegazione dei concept di C++20: cosa sono, quando servono e come usarli senza appesantire il codice."
read: "4 min"
tags: ["C++", "Tutorial"]
categories: ["Programmazione"]
image: "/blog/covers/cpp20_concepts.jpg"
---
## Introduzione
Questo articolo introduce i `concept`, una delle funzionalità più utili di C++20 per il codice generico. Vedremo la terminologia essenziale e come usarli per esprimere in modo esplicito i requisiti di un template.

Per un riferimento completo, cppreference raccoglie la [documentazione su vincoli e concept](https://en.cppreference.com/w/cpp/language/constraints).

## Motivazione
La prima domanda è semplice: a cosa servono i concept?

Quando scriviamo codice vogliamo, quasi sempre, che gli algoritmi e le strutture dati che implementiamo siano generici, cioè utilizzabili con tipi di dato diversi.
Vogliamo quindi un'unica soluzione generica, senza doverla reimplementare per tipi di dato specifici.
Questo offre diversi vantaggi:

- maggiore manutenibilità;
- riutilizzo dello stesso codice con tipi diversi;
- possibilità per chi usa l'API di fornire tipi personalizzati.

Gli esempi più comuni sono gli algoritmi generici e le strutture della libreria standard, come `std::swap` e `std::vector`.

In C++ questa astrazione viene espressa con un template, che può essere istanziato con tipi diversi. Spesso, però, il tipo non può essere scelto arbitrariamente: l'implementazione può richiedere operazioni o proprietà specifiche.

Supponiamo di avere un algoritmo che, dati due valori dello stesso tipo, voglia eseguire l'operazione di addizione binaria e restituire il risultato.

```cpp
#include <iostream>
#include <format>

template <typename T>
auto add(T const& a, T const& b) -> T {
    return a + b;
}

auto main() -> int {
    std::cout << std::format("{}\n", add(1, 2));
    // std::cout << std::format("{}\n", add("foo", "bar")); -> compilation error
    return 0;
}
```

Il parametro generico T del template non è vincolato: dal punto di vista della compilazione può essere istanziato con qualsiasi tipo di dato.
Tuttavia, se si richiede l'istanziazione di questa funzione con certi tipi di dato, il compilatore genererà un errore.

Questo avviene perché il template della funzione in questione richiede implicitamente che i tipi di dato passati come parametro debbano fornire l'operatore binario di addizione.
Quindi passando un tipo di dato che non presenta l'operatore di addizione binaria, il compilatore riscontra l'impossibilità di generare la funzione.

In quale punto fallisce il compilatore?

Non nella dichiarazione del template, ma durante la sua istanziazione, nel punto in cui l'implementazione tenta di usare un'operazione non disponibile.

Questo produce messaggi di errore complessi da decifrare e causa parecchia frustrazione.
In codebase medio-grandi, con strutture dati annidate, la situazione peggiora esponenzialmente.

Per risolvere questo inconveniente dobbiamo introdurre dei `vincoli`, così da definire in modo esplicito i requisiti dei parametri del template.

## Terminologia
### Modello (template)
Un modello è un costrutto che genera un tipo o una funzione normale in fase di compilazione in base agli argomenti forniti dall'utente per i parametri del modello.
Gli argomenti di un modello possono essere vincolati.

### Requisiti
Sono espressi tramite la parola chiave `requires`, che descrive le condizioni che un tipo o un'espressione devono soddisfare.
Per i dettagli rimando alla [documentazione di cppreference su requires](https://en.cppreference.com/w/cpp/language/requires).

### Vincolo (constraint)
Un `vincolo` è un insieme di `requisiti` sugli argomenti di un modello.

Questi sono usati per:

- Selezionare correttamente gli overloading delle funzioni.
- Decidere la specializzazione più appropriata per un modello.

### Concetti (concepts)
Un concetto è un predicato che racchiude un insieme di vincoli.
Ogni concetto viene valutato in fase di compilazione e diventa parte dell'interfaccia di un modello in cui viene usato sotto forma di vincolo.

Inoltre:

- Un tipo di dato che soddisfa tutti i requisiti (e quindi i vincoli) di un concetto si dice che modella tale concetto.
- Un concetto che è composto da un altro concetto e da vincoli aggiuntivi si dice che rifinisce il concetto (o i concetti).

## Sintassi
A seconda della complessità di un vincolo, possiamo usare tre sintassi diverse per esprimerlo.
Tutte le definizioni di seguito sono equivalenti ed è possibile combinarle insieme. Si tenga presente che std::integral è un concetto predefinito.

### Dichiarazione completa ed esplicita
Molto utile se si devono imporre vincoli multipli.

```cpp
template <typename T, typename Q>
    requires std::integral<T> and std::integral<Q>
auto add(T const t, Q const q) {
    return t + q;
}
```

### Dichiarazione intermedia
```cpp
template <std::integral T, std::integral Q>
auto add(T const t, Q const q) {
    return t + q;
}
```

### Dichiarazione compatta
```cpp
auto add(std::integral auto const t, std::integral auto const q) {
    return t + q;
}
```

## Soluzione
Per risolvere il problema dichiariamo il concept `Addable` e lo applichiamo ai parametri della funzione `add`. In questo caso usiamo la forma compatta.

```cpp
#include <iostream>
#include <concepts>

template <typename T> concept Addable = requires(T a, T b) {
 a + b; // requisito 1
};

auto add(Addable auto const t, Addable auto const q) {
    return t + q;
}

auto main() -> int {
    std::cout << add(5, 6) << std::endl;
    //std::cout << add("foo", "bar") << std::endl;  -> compilation error
    return 0;
}
```

Il template rifiuta in fase di compilazione qualsiasi tipo che non soddisfi il requisito. Rispetto alla versione non vincolata, il compilatore può produrre un errore più vicino all'interfaccia della funzione e quindi più semplice da interpretare.

## Conclusione
Abbiamo visto come usare concept e vincoli per rendere espliciti i requisiti dei template e ottenere errori di compilazione più comprensibili. Per approfondire il tema, cppreference offre una guida completa a [vincoli e concept](https://en.cppreference.com/w/cpp/language/constraints).
