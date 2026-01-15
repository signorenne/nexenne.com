---
title: "non_null in C++"
lang: it
date: 2026-06-23
desc: "Come distinguere un puntatore obbligatorio da un valore opzionale già nella firma di una funzione."
read: "4 min"
tags: ["C++", "Types"]
categories: ["Programmazione", "Analisi"]
image: "/blog/covers/non_null_cpp.webp"
---
## Introduzione
In C++ un puntatore grezzo comunica pochissimo.
Dice che una funzione riceve un indirizzo, ma lascia fuori la parte più importante: il contratto.

Quel puntatore può essere `nullptr`?
La funzione deve gestire l'assenza dell'oggetto?
Chi possiede la risorsa?
Per quanto tempo deve rimanere valido ciò a cui il puntatore fa riferimento?

Una firma come questa non risponde a nessuna di queste domande.

```cpp
auto render(widget* const target) -> void;
```

`target` potrebbe essere obbligatorio.
Potrebbe essere opzionale.
Potrebbe accettare `nullptr` come modo legittimo per dire "non renderizzare nulla".
Oppure la funzione potrebbe assumere semplicemente che il chiamante passi sempre un oggetto valido.

Il problema è che il tipo scelto non distingue questi casi.
Chi legge deve aprire l'implementazione, cercare un commento o ricostruire il contesto a mano.

## Puntatore opzionale o puntatore obbligatorio
Un puntatore che può essere nullo non è sbagliato di per sé.
È una scelta corretta quando l'assenza dell'oggetto fa parte del comportamento previsto.

```cpp
auto render(widget* const target) -> void {
  if (target == nullptr) {
    return;
  }

  target->paint();
}
```

Qui `nullptr` non rappresenta un errore: è uno dei casi gestiti dall'API.
La funzione lo controlla subito e il comportamento è chiaro.

Il caso interessante è l'opposto.
Se una funzione non può lavorare senza quell'oggetto, continuare a usare un semplice `widget*` lascia aperta una possibilità che il contratto non ammette.
La firma suggerisce che `nullptr` sia accettabile, mentre per l'implementazione sarebbe solo un bug del chiamante.

## L'idea di non_null
Un tipo `non_null<T>` serve a rendere esplicita questa precondizione.
Non possiede l'oggetto, non ne estende la durata e non decide chi deve distruggerlo.
Dice una cosa più piccola, ma importante: qui deve arrivare un valore non nullo.

Una versione ridotta, sufficiente per mostrare il meccanismo, può essere questa.

```cpp
#include <cassert>
#include <concepts>
#include <cstddef>
#include <memory>
#include <utility>

namespace detail {

template <typename Pointer>
concept pointer_like = requires(Pointer const ptr) {
  *ptr;
  { ptr != nullptr } -> std::convertible_to<bool>;
};

}  // namespace detail

template <detail::pointer_like Pointer>
class non_null {
public:
  using pointer_type = Pointer;
  using element_type = typename std::pointer_traits<pointer_type>::element_type;

private:
  pointer_type m_ptr;

public:
  constexpr non_null(pointer_type ptr) noexcept : m_ptr{std::move(ptr)} {
    if !consteval {
      assert(m_ptr != nullptr && "non_null: constructed with nullptr");
    }
  }

  non_null(std::nullptr_t) = delete;
  auto operator=(std::nullptr_t) -> non_null& = delete;

  [[nodiscard]] constexpr auto get() const noexcept -> pointer_type const& {
    return m_ptr;
  }

  constexpr auto operator->() const noexcept -> pointer_type const& {
    return m_ptr;
  }

  constexpr auto operator*() const noexcept -> element_type& {
    return *m_ptr;
  }
};
```

Questo wrapper non pretende di essere una libreria completa.
È utile però per fissare l'idea di base:

- costruirlo direttamente da `nullptr` è vietato;
- un valore nullo passato tramite una variabile viene intercettato in debug;
- dentro la funzione chiamata il controllo non deve essere ripetuto a ogni uso.

In codice di produzione si può scegliere una versione più robusta, con controlli espliciti a runtime o con una libreria già adottata dal progetto.
Il punto resta lo stesso: l'obbligo di passare un valore non nullo diventa parte della firma, non una nota implicita da ricordare.

## Un esempio
Immaginiamo una funzione che deve scrivere su un logger.
Senza logger non può svolgere il proprio lavoro, quindi modellarlo come parametro opzionale sarebbe fuorviante.

```cpp
struct logger {
  auto write(std::string const& message) const -> void;
};

auto run_job(non_null<logger const*> const log, int const items) -> void {
  log->write("starting job");

  for (auto i{0}; i < items; ++i) {
    log->write("processed item");
  }

  log->write("job complete");
}
```

La firma ora è più precisa.
`run_job` richiede un logger valido e non descrive l'assenza come un caso normale.

Se chi chiama parte da un puntatore che potrebbe essere nullo, deve risolvere il problema prima della chiamata.

```cpp
logger const* const maybe_log{find_logger()};

if (maybe_log == nullptr) {
  return;
}

run_job(non_null{maybe_log}, 10);
```

Il controllo rimane nel punto in cui l'assenza può davvero verificarsi.
Dopo quel confine, il resto del codice lavora con un contratto più stretto e più leggibile.

## Cosa non risolve
`non_null` non rende valido un oggetto già distrutto.
Un puntatore può essere diverso da `nullptr` e, allo stesso tempo, puntare a memoria non più valida.
Il wrapper non protegge da dangling pointer, race condition o lifetime gestite male.

Questa distinzione è fondamentale.
`non_null` esprime una garanzia sulla nullità, non sulla proprietà della risorsa e non sulla sua durata.

Per questo va usato come tipo di confine, soprattutto nei parametri di funzione o nei membri che rappresentano viste non proprietarie.
Quando invece bisogna esprimere proprietà, trasferimento o condivisione della risorsa, il tipo giusto è un altro: `std::unique_ptr`, `std::shared_ptr`, un riferimento o un oggetto con semantica dedicata.

## Quando usarlo
`non_null` è utile quando `nullptr` sarebbe un bug, non una variante del comportamento.

Esempi tipici:

- una dipendenza obbligatoria passata a una funzione;
- un oggetto già validato prima di chiamare un algoritmo;
- una vista non proprietaria conservata da un componente;
- un puntatore ottenuto da una fase di inizializzazione che deve riuscire.

Non serve wrappare ogni puntatore del codice.
Serve nei punti in cui chiarire il contratto riduce ambiguità per chi legge e per chi chiama l'API.

## Conclusione
`non_null` non è una soluzione generale alla sicurezza dei puntatori.
È un modo semplice per spostare una regola importante nel punto in cui dovrebbe stare: il tipo.

Se `nullptr` è un valore significativo, il codice deve trattarlo come un caso normale.
Se invece l'assenza non è ammessa, conviene dirlo nella firma.
Il risultato è un'interfaccia migliore, con meno supposizioni nascoste e meno controlli ripetuti nel corpo delle funzioni.
