---
title: "C++20 Ranges and Views"
lang: it
date: 2024-09-11
desc: "Un esempio per vedere come ranges e views di C++20 rendono più leggibili gli algoritmi sulle collezioni."
read: "4 min"
tags: ["C++"]
categories: ["Programmazione"]
image: "/blog/covers/cpp20_ranges_and_views.jpg"
---
## Introduzione
In questo articolo vediamo come `std::ranges` e `std::views`, introdotti in C++20, rendano più chiara la composizione degli algoritmi sulle collezioni.

## Modello computazionale
### Quesito
Vogliamo scrivere un algoritmo che riceva una collezione di numeri interi e produca, in ordine inverso, soltanto quelli divisibili per 3.

La tabella seguente mostra alcuni esempi di input e output.

| Input                 | Output        |
|-----------------------|---------------|
| 3 0 10 9 12 7 30 14 6 | 6 30 12 9 0 3 |
| 12 14 303 25          | 25 303        |
| 15 17 21 0 18         | 18 0 21 15    |

### Soluzione pre C++20
```cpp
#include <algorithm>
#include <vector>
#include <iostream>

auto main() -> int {
    const std::vector<int> numbers{3, 0, 10, 9, 12, 7, 30, 14, 6};

    auto isDivisibleByThree = [](int const i) { return i % 3 == 0; };

    std::vector<int> tmp{};

    std::copy_if(numbers.begin(), numbers.end(), std::back_inserter(tmp), isDivisibleByThree);
    std::reverse(tmp.begin(), tmp.end());

    for (auto const& i : tmp)
        std::cout << i << " ";

    return 0;
}
```

Questo piccolo frammento di codice esegue questi passaggi:

- Crea uno `std::vector` temporaneo di supporto.
- Copia in `tmp` tutti gli elementi di `numbers` che soddisfano il predicato `isDivisibleByThree`.
- Inverte la sequenza degli elementi di `tmp`.

La soluzione funziona, ma richiede un contenitore temporaneo e più passaggi separati. Con C++20 possiamo descrivere la stessa trasformazione in modo più diretto.

### Soluzione con std::ranges
```cpp
#include <algorithm>
#include <vector>
#include <iostream>
#include <ranges>

auto main() -> int {
    const std::vector<int> numbers{3, 0, 10, 9, 12, 7, 30, 14, 6};

    auto isDivisibleByThree = [](int const i) { return i % 3 == 0; };

    auto result{std::views::reverse(std::views::filter(numbers, isDivisibleByThree))};

    for (auto const& i : result)
        std::cout << i << " ";

    return 0;
}
```

La differenza è evidente; prima di entrare nello specifico, però, conviene chiarire meglio i concetti di range e view.

## Ranges
Un range rappresenta una sequenza di elementi, o più in generale qualcosa su cui è possibile iterare.

Per definizione, un range è una coppia di iteratori `begin` e `end`: il primo punta all'inizio di una collezione o sequenza, il secondo alla fine.

I contenitori della libreria standard soddisfano questa definizione e possono quindi essere usati come range.

### Classificazione
I range possono essere classificati in modi diversi. Una delle distinzioni principali riguarda le capacità degli iteratori.

Avendo affrontato i concepts nel [post precedente](/blog/cpp20_concepts/), possiamo riassumere i ranges nella tabella seguente.

| Concept                          | Descrizione                                                                    |
|----------------------------------|--------------------------------------------------------------------------------|
| std::ranges::input_range         | Può essere iterato dall'inizio alla fine `almeno una volta`                    |
| std::ranges::forward_range       | Può essere iterato dall'inizio alla fine `molteplici volte`                    |
| std::ranges::bidirectional_range | L'iteratore può eseguire l'operazione `--` (vai all'elemento precedente)       |
| std::ranges::random_access_range | Esiste l'operatore `[]` che permette l'accesso agli elementi in tempo costante |
| std::ranges::contiguous_range    | Gli elementi sono vincolati ad essere memorizzati contiguamente nella memoria  |

La classificazione corrisponde ai relativi concept degli iteratori, come `std::forward_iterator`.

## Views
Tre proprietà delle view sono particolarmente importanti:

- Una view è un range.
- Una view non possiede i dati a cui accede.
- Una view applica le modifiche solo quando un elemento viene richiesto (lazy-evaluation).

### Una view è un range {#una-view-è-un-range}

Per definizione, una view \\(w\\) è un range definito su un altro range \\(r\\).
La view può applicare trasformazioni al range osservato tramite algoritmi e altre operazioni, sfruttando la lazy-evaluation.

### Una view non possiede i dati a cui accede
Quando si accede a un elemento attraverso una view, si continua a lavorare sui dati gestiti dal range sottostante.

Questo ha due implicazioni:

- Le viste sono veloci da creare, perché non hanno bisogno di copiare i dati sottostanti.
- Le trasformazioni della view non modificano la struttura del contenitore originale.

<!--listend-->

```cpp
#include<iostream>
#include<vector>
#include<ranges>

auto main() -> int {
    std::vector numbers{1, 2, 3, 4, 5};
    auto v{std::views::reverse(numbers)};

    for (auto const& i : numbers)
        std::cout << i << " ";
    return 0;
}

// Output: 1 2 3 4 5
```

Come si può notare, la view non ha modificato il range `numbers`.
È vero però il contrario: modificando il contenitore originale, il cambiamento si ripercuote su tutte le view che usano quel range.

Avremo pertanto

```cpp
#include<iostream>
#include<vector>
#include<ranges>

auto main() -> int {
    std::vector numbers{1, 2, 3, 4, 5};
    auto v{std::views::reverse(numbers)};

    for (auto const& i : v)
        std::cout << i << " ";

    std::cout << std::endl;

    numbers[2] = 100;
    numbers[4] = 77;

    for (auto const& i : v)
        std::cout << i << " ";

    return 0;
}

// Output: 5 4 3 2 1
//         77 4 100 2 1
```

### Lazy-evaluation
Una view applica le trasformazioni quando gli elementi vengono richiesti, non necessariamente nel momento in cui viene creata. Questa valutazione differita evita elaborazioni e copie non necessarie.

```cpp
#include<iostream>
#include<vector>
#include<ranges>

auto main() -> int {
    std::vector numbers{1, 2, 3, 4, 5};
    auto v{std::views::reverse(numbers)};
    std::cout << *v.begin() << std::endl; // la view viene valutata qua
    return 0;
}

// Output: 5
```

### Composizione e pipeline
Qualcuno potrebbe chiedersi perché ho scritto

```cpp
auto v{std::views::reverse(numbers)};
```

Anziché utilizzare

```cpp
std::views::reverse v{numbers};
```

Il motivo è che `std::views::reverse` non è una view, ma un adattatore: prende il range sottostante, in questo caso uno `std::vector`, e restituisce una view su quello `std::vector`.
Il tipo esatto della view viene nascosto dietro la keyword `auto`; in questo modo non dobbiamo preoccuparci di scrivere gli argomenti del template della view.
Un ulteriore vantaggio di questa forma è la possibilità di concatenare più adattatori tramite pipe.

Per esempio anziché utilizzare

```cpp
auto v{std::views::reverse(std::views::filter(numbers, isDivisibleByThree))};
```

Possiamo scrivere

```cpp
auto v{numbers | std::views::filter(isDivisibleByThree) | std::views::reverse};
```

## Esempi
Vogliamo creare una view dei primi 5 elementi di un std::vector e stampare il risultato.

```cpp
#include<iostream>
#include<vector>
#include<ranges>

auto main() -> int {
    std::vector numbers{1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
    auto v{numbers | std::views::take(5)};

    for (auto const& i : v)
        std::cout << i << " ";
}

// Output: 1 2 3 4 5
```

Vogliamo sfruttare un algoritmo range based per stampare un std::vector invertito e ripulito da tutti i valori negativi.

```cpp
#include <algorithm>
#include <iostream>
#include <ranges>
#include <vector>

auto main() -> int {
    std::vector numbers{-1, 3, -100, -4, 0, 3, -7, 1};
    auto predicate = [](int const i) -> bool {
        return i >= 0;
    };
    auto printer = [](int const i) {
        std::cout << i << " ";
    };

    std::ranges::for_each(numbers | std::views::reverse | std::views::filter(predicate), printer);
}

// Output: 1 3 0 3
```

## Concetti avanzati
### Range factory
La libreria standard include anche adattatori capaci di generare una view senza partire da un range esistente.

Una tra le svariate è std::views::iota, che crea una view incrementale di interi.

```cpp
#include <iostream>
#include <ranges>

auto main() -> int {
    for (int const i : std::views::iota(1, 7)) {
        std::cout << i << " ";
    }
}

// Output: 1 2 3 4 5 6
```

### Zip Views
`std::views::zip`, introdotta in C++23, permette di combinare più range in un'unica view. Ogni elemento prodotto è una tupla che contiene i valori corrispondenti dei range di origine.

Cerchiamo di capire meglio con un esempio.

```cpp
#include <iostream>
#include <ranges>
#include <vector>

auto main() -> int {

    std::vector numbers{1, 2, 3, 4};
    std::vector english{"cat", "dog", "table", "sun"};
    std::vector italian{"gatto", "cane", "tavolo", "sole"};

    for (const auto& i : std::views::zip(numbers, english, italian)) {
        std::cout << std::get<0>(i) << ". "
                  << std::get<1>(i) << ": "
                  << std::get<2>(i) << '\n';
    }

    return 0;
}
```

## Conclusione
Range e view permettono di descrivere una pipeline di trasformazioni senza introdurre contenitori temporanei non necessari. Per una panoramica completa degli adattatori e degli algoritmi disponibili, si può consultare la [documentazione della libreria ranges](https://en.cppreference.com/w/cpp/ranges).
