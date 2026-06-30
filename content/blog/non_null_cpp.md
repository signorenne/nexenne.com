---
title: "non_null in C++"
lang: it
date: 2026-06-23
desc: "Distinguere un puntatore obbligatorio da un valore opzionale già nella firma di una funzione."
read: "4 min"
tags: ["C++", "Types"]
categories: ["Programmazione", "Analisi"]
image: "/blog/covers/non_null_cpp.webp"
---
## Introduzione
In C++ un puntatore grezzo comunica meno di quanto sembri.
Dice che una funzione riceve un indirizzo, ma non racconta quasi nulla del contratto che quell'indirizzo dovrebbe rispettare.

Quel valore può essere `nullptr`?
L'assenza dell'oggetto è un caso previsto?
La funzione possiede la risorsa o la osserva soltanto?
Per quanto tempo deve rimanere valido l'oggetto puntato?

Una firma come questa lascia aperte troppe interpretazioni.

```cpp
auto render(widget* const target) -> void;
```

`target` potrebbe essere obbligatorio.
Potrebbe essere opzionale.
`nullptr` potrebbe essere un modo esplicito per dire "non renderizzare nulla".
Oppure `target` potrebbe essere un parametro che l'implementazione assume sempre valido, senza che il tipo lo renda visibile a chi legge.

Il problema è proprio qui: la firma non distingue tra un caso ammesso e un errore del chiamante.
Per capire il contratto reale bisogna aprire l'implementazione, cercare un commento, oppure ricostruire il contesto da altri punti del codice.

## Puntatore opzionale o puntatore obbligatorio
Un puntatore che può essere nullo non è sbagliato di per sé.
È una scelta corretta quando l'assenza dell'oggetto fa parte del comportamento dell'API.

```cpp
auto render(widget* const target) -> void {
  if (target == nullptr) {
    return;
  }

  target->paint();
}
```

In questo esempio `nullptr` non è un errore.
È un input valido, gestito subito, con un comportamento chiaro: se non c'è un target, non viene renderizzato nulla.

Il caso interessante è l'altro.
Se una funzione non può fare nulla senza quell'oggetto, continuare a usare `widget*` rende il contratto più debole del necessario.
La firma suggerisce che `nullptr` possa arrivare, mentre per quella funzione sarebbe soltanto una precondizione violata.

## L'idea di non_null
`non_null<T>` serve a spostare questa precondizione nel tipo.
Non possiede l'oggetto, non ne prolunga il lifetime e non decide chi deve distruggerlo.
Fa una cosa più piccola, ma molto utile: comunica che il valore deve essere presente.

Una versione ridotta, utile per capire il meccanismo, può essere questa.

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

Questa versione non vuole essere una libreria completa.
Serve solo a rendere visibile l'idea:

- costruire un `non_null` direttamente da `nullptr` non è permesso;
- un valore nullo passato tramite una variabile viene intercettato in debug;
- dentro la funzione chiamata non serve ripetere lo stesso controllo a ogni accesso.

In un progetto reale si può scegliere un'implementazione più robusta, con una strategia di errore esplicita o con una libreria già adottata dal team.
Il punto rimane lo stesso: se un puntatore non può essere nullo, quella regola dovrebbe stare nella firma, non nella memoria di chi chiama.

## Un esempio
Un esempio semplice è una funzione che deve scrivere su un logger.
Senza logger non può fare il proprio lavoro, quindi modellare quel parametro come opzionale sarebbe fuorviante.

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
`run_job` richiede un logger valido e non presenta l'assenza come un caso normale di esecuzione.

Se il chiamante dispone di un puntatore che potrebbe essere nullo, deve risolvere quel dubbio prima della chiamata.

```cpp
logger const* const maybe_log{find_logger()};

if (maybe_log == nullptr) {
  return;
}

run_job(non_null{maybe_log}, 10);
```

Il controllo resta nel punto in cui l'assenza può davvero verificarsi.
Superato quel confine, il resto del codice lavora con un contratto più stretto e più leggibile: non si chiede più a ogni funzione di difendersi da un caso che non le appartiene.

## Cosa non risolve
`non_null` non rende valido un oggetto già distrutto.
Un puntatore può essere diverso da `nullptr` e puntare comunque a memoria non più valida.
Il wrapper non protegge da dangling pointer, race condition o gestione scorretta del lifetime.

Questa distinzione è importante.
`non_null` esprime una garanzia sulla nullità, non sulla proprietà della risorsa e non sulla sua durata.

Per questo funziona bene come tipo di confine: parametri di funzione, membri non owning, viste verso oggetti che devono esistere.
Quando invece bisogna descrivere ownership, trasferimento o condivisione, il tipo giusto è un altro: `std::unique_ptr`, `std::shared_ptr`, un riferimento o un owner dedicato.

## Quando usarlo
`non_null` è utile quando `nullptr` sarebbe un bug, non una variante del comportamento.

Esempi tipici:

- una dipendenza obbligatoria passata a una funzione;
- un oggetto già validato prima di chiamare un algoritmo;
- una vista non owning conservata da un componente;
- un puntatore prodotto da una fase di inizializzazione che deve riuscire.

Non serve avvolgere ogni puntatore del codice in un wrapper.
Serve nei punti in cui il contratto è più importante della comodità di una firma generica, soprattutto quando bisogna separare chiaramente il punto in cui l'assenza viene gestita dal punto in cui il valore viene usato.

## Conclusione
`non_null` non risolve tutti i problemi dei puntatori.
Risolve un problema più preciso: evitare che un parametro obbligatorio sembri opzionale.

Se `nullptr` è un valore significativo, il codice deve trattarlo come un caso normale.
Se invece l'assenza non è ammessa, conviene dirlo nel tipo.
L'interfaccia diventa più onesta, perché sposta una supposizione nascosta dentro la firma e lascia al corpo della funzione un contratto più semplice da leggere.
