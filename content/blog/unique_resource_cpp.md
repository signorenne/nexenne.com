---
title: "unique_resource in C++"
lang: it
date: 2026-06-15
desc: "Applicare RAII anche agli handle che non sono puntatori."
read: "5 min"
tags: ["C++", "RAII"]
categories: ["Programmazione", "Tutorial"]
image: "/blog/covers/unique_resource_cpp.webp"
---
## Introduzione
`std::unique_ptr` è uno dei modi più chiari per esprimere ownership in C++.
Possiede un puntatore, lo libera nel distruttore e impedisce copie accidentali.

Non tutte le risorse, però, sono puntatori.
Molte API restituiscono file descriptor, socket, handle opachi, id numerici o valori che devono essere rilasciati con una funzione specifica.
In questi casi serve la stessa garanzia di RAII, ma applicata a un tipo più generico.

`unique_resource` è un piccolo owner per questo scenario.
Tiene insieme un handle e una funzione di cleanup.
Quando l'oggetto esce dallo scope, se possiede ancora la risorsa, esegue il deleter una sola volta.

## Il problema
Il punto di partenza è una funzione che apre un sensore, lo configura e legge un header.
Se un passaggio fallisce, l'handle deve essere chiuso prima di uscire.

```cpp
auto use_sensor(char const* const path) -> bool {
  int const fd{open_sensor(path)};

  if (fd == -1) {
    return false;
  }

  if (!configure(fd)) {
    close_sensor(fd);
    return false;
  }

  if (!read_header(fd)) {
    close_sensor(fd);
    return false;
  }

  close_sensor(fd);
  return true;
}
```

Il codice è corretto, ma la garanzia è sparsa.
Ogni percorso di uscita dopo l'apertura deve contenere la chiamata a `close_sensor`.

Il problema non è la chiamata in sé.
Il problema è che la risorsa ha una regola precisa: se l'acquisizione riesce, il rilascio deve essere eseguito.
Quella regola dovrebbe essere modellata da un oggetto, non affidata alla disciplina di chi modifica la funzione.

## L'idea di unique_resource
Un `unique_resource` tiene insieme tre informazioni:

- il valore della risorsa, per esempio un file descriptor;
- il deleter, cioè la funzione usata per rilasciarla;
- un flag di ownership, perché alcuni valori possono rappresentare una risorsa non valida.

Una versione semplificata è la seguente.

```cpp
#include <type_traits>
#include <utility>

template <typename Resource, typename Deleter>
class unique_resource final {
public:
  using resource_type = Resource;
  using deleter_type = Deleter;

  static_assert(std::is_nothrow_invocable_v<deleter_type&, resource_type&>);

private:
  resource_type m_resource;
  [[no_unique_address]] deleter_type m_deleter;
  bool m_owns{false};

public:
  unique_resource(
    resource_type resource,
    deleter_type deleter,
    bool const owns = true
  ) noexcept(std::is_nothrow_move_constructible_v<resource_type> &&
             std::is_nothrow_move_constructible_v<deleter_type>)
      : m_resource{std::move(resource)}
      , m_deleter{std::move(deleter)}
      , m_owns{owns} {}

  unique_resource(unique_resource const&) = delete;
  auto operator=(unique_resource const&) -> unique_resource& = delete;

  unique_resource(unique_resource&& other
  ) noexcept(std::is_nothrow_move_constructible_v<resource_type> &&
             std::is_nothrow_move_constructible_v<deleter_type>)
      : m_resource{std::move(other.m_resource)}
      , m_deleter{std::move(other.m_deleter)}
      , m_owns{std::exchange(other.m_owns, false)} {}

  ~unique_resource() noexcept { reset(); }

  auto reset() noexcept -> void {
    if (m_owns) {
      m_deleter(m_resource);
      m_owns = false;
    }
  }

  [[nodiscard]] auto release() noexcept -> resource_type {
    m_owns = false;
    return std::move(m_resource);
  }

  [[nodiscard]] auto get() const noexcept -> resource_type const& {
    return m_resource;
  }

  [[nodiscard]] auto owns() const noexcept -> bool { return m_owns; }
};
```

La copia è vietata perché due owner non devono rilasciare lo stesso handle.
Il move, invece, trasferisce l'ownership e disattiva l'oggetto sorgente.

Il distruttore chiama `reset()`.
Se l'oggetto possiede ancora la risorsa, il deleter viene eseguito.
Se la risorsa è stata rilasciata o spostata altrove, il distruttore non fa nulla.

La parte importante è che la regola di rilascio non è più distribuita tra i percorsi di uscita.
È una proprietà dell'oggetto che possiede la risorsa.

## Gestire il valore non valido
Molte API usano un valore sentinella per segnalare il fallimento.
Un file descriptor può usare `-1`, un handle può usare `nullptr`, un id può usare `0`.

Conviene fissare questa regola nel momento in cui si costruisce l'owner.

```cpp
template <typename Resource, typename Invalid, typename Deleter>
[[nodiscard]] auto make_unique_resource_checked(
  Resource resource,
  Invalid const invalid,
  Deleter deleter
) -> unique_resource<Resource, Deleter> {
  auto const owns{resource != invalid};

  return unique_resource<Resource, Deleter>{
    std::move(resource),
    std::move(deleter),
    owns
  };
}
```

Se il valore è valido, l'oggetto possiede la risorsa.
Se coincide con il valore sentinella, l'oggetto non possiede la risorsa e il distruttore non chiama il deleter.

La distinzione è importante.
Un handle non valido non è una risorsa da chiudere, ma il segnale che l'acquisizione non è avvenuta.
Chiudere un valore non valido sarebbe, nel migliore dei casi, inutile; nel peggiore, potrebbe nascondere un bug o chiamare l'API con un valore che non rappresenta nessuna risorsa.

## La funzione riscritta
Con un owner locale, la funzione torna a esprimere la propria logica.
La chiusura non deve più essere ripetuta in ogni percorso di uscita.

```cpp
auto use_sensor(char const* const path) -> bool {
  auto const close{[](int& fd) noexcept {
    close_sensor(fd);
  }};

  auto sensor{make_unique_resource_checked(open_sensor(path), -1, close)};

  if (!sensor.owns()) {
    return false;
  }

  if (!configure(sensor.get())) {
    return false;
  }

  if (!read_header(sensor.get())) {
    return false;
  }

  return true;
}
```

Ora ogni uscita dalla funzione passa dallo stesso punto: il distruttore di `sensor`.
Il cleanup resta associato all'acquisizione e non dipende dal numero di percorsi di uscita presenti nella funzione.

Diventa più chiaro anche il significato della funzione.
La funzione non deve più ripetere in ogni ramo la chiusura del sensore; la dichiara una volta, subito dopo averlo aperto.

## Quando usare release
`release()` serve quando l'ownership deve passare a qualcun altro.
Non libera la risorsa.
Disattiva l'owner corrente e restituisce l'handle.

```cpp
auto const fd{sensor.release()};
register_sensor(fd);
```

Va usato solo quando il codice che riceve l'handle diventa davvero responsabile della chiusura.
Altrimenti `release()` trasforma un cleanup automatico in una responsabilità manuale, e il vantaggio di RAII sparisce.

Questo è un punto facile da sottovalutare.
`release()` non significa "rilascia la risorsa", ma "smetti di possederla qui".
Da quel momento deve esistere un altro punto del codice responsabile di chiuderla.

## Quando usarlo
`unique_resource` è utile per file descriptor, socket, handle di librerie C, mapping, lock restituiti da API esterne e, più in generale, per risorse che non si modellano bene con `std::unique_ptr`.

Se la risorsa è un puntatore normale, `std::unique_ptr` resta la scelta migliore.
Se invece serve solo eseguire un'azione alla fine dello scope, senza possedere un handle, uno scope guard è più diretto.

La differenza è questa: `scope_guard` protegge un'azione, `unique_resource` possiede una risorsa.
Quando la distinzione è visibile già nel tipo, anche il codice che usa l'API diventa più difficile da usare in modo errato.

## Conclusione
`unique_resource` porta RAII fuori dal classico caso del puntatore.
Rende visibile l'ownership, lega acquisizione e cleanup, e riduce i punti in cui bisogna ricordarsi di chiamare il cleanup.

Quando una risorsa ha una regola di rilascio precisa, incapsularla in un owner dedicato rende il codice più leggibile e più robusto.
Non perché il cleanup scompaia, ma perché finalmente ha un posto chiaro in cui vivere.
