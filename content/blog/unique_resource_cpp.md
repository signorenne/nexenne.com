---
title: "unique_resource in C++: RAII per handle e risorse non rappresentate da puntatori"
lang: it
date: 2026-04-21
lastmod: 2026-07-04
desc: "Applicare RAII a file descriptor, socket e handle con ownership esclusiva."
read: "6 min"
tags: ["C++", "RAII"]
categories: ["Programmazione", "Tutorial"]
image: "/blog/covers/unique_resource_cpp.webp"
---

## Abstract

`std::unique_ptr` rende evidente una regola importante: un oggetto possiede una risorsa e la rilascia una sola volta, quando termina il proprio ciclo di vita. Il problema è che molte API non restituiscono puntatori. File descriptor, socket, handle opachi e identificatori numerici usano rappresentazioni e funzioni di cleanup differenti.

In questi casi mi interessa conservare la stessa proprietà, non necessariamente lo stesso tipo: acquisizione e rilascio devono rimanere legati, la copia deve essere vietata e lo spostamento deve trasferire l'ownership senza duplicarla.

Un `unique_resource` modella proprio questo scenario. In questo articolo ne costruiremo una versione didattica e volutamente limitata, chiarendo anche dove un'implementazione generale richiede garanzie più forti.

## Il problema

Supponiamo che un'API apra un sensore e restituisca un handle intero. Il valore `-1` indica il fallimento, mentre `close_sensor()` rilascia un handle valido.

```cpp
auto use_sensor(char const* path) -> bool {
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

La funzione è comprensibile, ma la garanzia di rilascio è distribuita tra i percorsi di uscita. Ogni nuovo controllo deve ricordarsi di chiamare `close_sensor()`. Un'eccezione introdotta dopo l'apertura aggiungerebbe un altro percorso da gestire.

La risorsa ha invece una regola unica: se l'acquisizione riesce, esiste esattamente un owner responsabile della chiusura. Conviene rappresentare questa regola con un oggetto.

## Cosa deve garantire l'owner

Un owner generico per handle deve conservare:

- il valore che identifica la risorsa;
- il deleter che conosce la funzione di cleanup;
- lo stato di ownership, perché un valore sentinella può indicare che l'acquisizione non è mai avvenuta.

La copia deve essere vietata: due copie crederebbero entrambe di possedere lo stesso handle. Lo spostamento è invece utile, ma deve disattivare l'oggetto sorgente. Anche il deleter ha un contratto: il cleanup eseguito dal distruttore non deve propagare eccezioni.

## Un'implementazione minimale

La seguente versione usa C++20 e accetta soltanto risorsa e deleter spostabili senza eccezioni. È un vincolo restrittivo, ma evita che la costruzione o il trasferimento dell'owner falliscano dopo l'acquisizione lasciando la risorsa senza protezione.

```cpp
#include <concepts>
#include <functional>
#include <type_traits>
#include <utility>

template <typename Resource, typename Deleter>
class [[nodiscard]] unique_resource final {
public:
  using resource_type = Resource;
  using deleter_type = Deleter;

  static_assert(std::is_nothrow_move_constructible_v<resource_type>);
  static_assert(std::is_nothrow_move_constructible_v<deleter_type>);
  static_assert(std::is_nothrow_invocable_v<deleter_type&, resource_type&>);

  unique_resource(resource_type resource, deleter_type deleter, bool owns = true) noexcept
      : m_resource{std::move(resource)}, m_deleter{std::move(deleter)}, m_owns{owns} {}

  unique_resource(unique_resource const&) = delete;
  auto operator=(unique_resource const&) -> unique_resource& = delete;

  unique_resource(unique_resource&& other) noexcept
      : m_resource{std::move(other.m_resource)}
      , m_deleter{std::move(other.m_deleter)}
      , m_owns{std::exchange(other.m_owns, false)} {}

  auto operator=(unique_resource&&) -> unique_resource& = delete;

  ~unique_resource() noexcept {
    reset();
  }

  auto reset() noexcept -> void {
    if (std::exchange(m_owns, false)) {
      std::invoke(m_deleter, m_resource);
    }
  }

  [[nodiscard]] auto release() noexcept -> resource_type {
    m_owns = false;
    return std::move(m_resource);
  }

  [[nodiscard]] auto get() noexcept -> resource_type& {
    return m_resource;
  }

  [[nodiscard]] auto get() const noexcept -> resource_type const& {
    return m_resource;
  }

  [[nodiscard]] auto owns() const noexcept -> bool {
    return m_owns;
  }

private:
  resource_type m_resource;
  [[no_unique_address]] deleter_type m_deleter;
  bool m_owns{false};
};
```

`reset()` disattiva l'ownership prima di invocare il deleter. Il distruttore può quindi chiamarlo senza duplicare il rilascio. `[[no_unique_address]]` permette al compilatore di non riservare spazio separato per un deleter vuoto quando le regole di layout lo consentono; non è però una promessa universale sulla dimensione finale del tipo.

La move assignment è eliminata per mantenere l'esempio semplice. Un'implementazione completa potrebbe supportarla, ma dovrebbe prima rilasciare correttamente l'eventuale risorsa già posseduta dall'oggetto di destinazione.

## Gestire il valore non valido

Molte API usano un valore sentinella: `-1` per alcuni file descriptor, `nullptr` per alcuni handle oppure un valore definito dalla libreria. Possiamo concentrare il controllo in una factory.

```cpp
template <typename Resource, typename Invalid, typename Deleter>
  requires std::is_nothrow_constructible_v<std::remove_cvref_t<Resource>, Resource&&>
           && std::is_nothrow_constructible_v<std::remove_cvref_t<Deleter>, Deleter&&>
           && requires(std::remove_reference_t<Resource> const& resource, Invalid const& invalid) {
                { resource != invalid } noexcept -> std::convertible_to<bool>;
              }
[[nodiscard]] auto make_unique_resource_checked(
  Resource&& resource, Invalid const& invalid, Deleter&& deleter
) noexcept -> unique_resource<std::remove_cvref_t<Resource>, std::remove_cvref_t<Deleter>> {
  using resource_type = std::remove_cvref_t<Resource>;
  using deleter_type = std::remove_cvref_t<Deleter>;

  auto const owns{resource != invalid};

  return unique_resource<resource_type, deleter_type>{
    resource_type{std::forward<Resource>(resource)},
    deleter_type{std::forward<Deleter>(deleter)},
    owns
  };
}
```

Il confronto è richiesto `noexcept` e viene eseguito prima di trasferire la risorsa. La factory verifica inoltre che risorsa e deleter possano essere costruiti senza eccezioni dalle esatte categorie di valore ricevute. In questo modo non legge un oggetto già mosso e non può fallire lasciando senza owner una risorsa acquisita.

L'ordine delle espressioni al punto di chiamata resta importante. È prudente costruire prima il deleter e poi acquisire la risorsa, anziché nascondere inizializzazioni potenzialmente fallibili nello stesso elenco di argomenti.

## La funzione riscritta

Definiamo quindi il deleter prima di chiamare `open_sensor()`.

```cpp
auto use_sensor(char const* path) -> bool {
  auto const close{[](int& fd) noexcept { close_sensor(fd); }};

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

Ogni uscita successiva alla costruzione di `sensor` attraversa lo stesso distruttore. La funzione può tornare a esprimere la propria logica, mentre la chiusura diventa una proprietà dell'owner.

## `release()` non chiude la risorsa

Il nome può trarre in inganno. `release()` non esegue il deleter: rimuove la responsabilità dall'owner corrente e restituisce l'handle.

```cpp
auto fd{sensor.release()};
register_sensor(fd);  // da qui, un altro owner deve chiudere fd
```

Questa operazione serve soltanto quando l'ownership viene trasferita davvero. Se chi riceve l'handle non assume chiaramente la responsabilità del cleanup, `release()` reintroduce la gestione manuale che RAII aveva eliminato.

## Quando usarlo

`unique_resource` è adatto a file descriptor, socket, handle di librerie C, mapping e altre risorse rappresentate da valori che non sono puntatori. `std::unique_ptr` può essere adattato anche ad alcuni handle tramite un tipo `pointer` personalizzato nel deleter, ma per gli interi sentinella il modello può risultare meno diretto.

Se la risorsa è un normale puntatore con un deleter, `std::unique_ptr` rimane la scelta naturale. Se invece non esiste un handle da possedere e serve soltanto eseguire un'azione alla fine dello scope, uno scope guard descrive meglio l'intento.

È inoltre importante non presentare questo esempio come una facility standard di C++23. La proposta WG21 P0052 specifica `unique_resource` insieme agli scope guard, e il working draft del Library Fundamentals TS v3 la colloca in `std::experimental`. La disponibilità concreta dipende dalla toolchain; in produzione preferirei una versione mantenuta e collaudata quando il progetto ne offre una.

## Conclusione

`unique_resource` estende RAII oltre il caso del puntatore. Rende visibile l'ownership, vieta le copie accidentali e associa il cleanup al ciclo di vita dell'oggetto.

La parte difficile non è chiamare il deleter nel distruttore. È mantenere la garanzia anche durante costruzione, spostamento, gestione del valore sentinella e trasferimento dell'handle. Per questo una versione didattica può restare piccola, mentre un owner generico destinato alla produzione merita vincoli, test e una gestione delle eccezioni molto più accurati.

## Riferimenti

- [P0052R10 — Generic Scope Guard and RAII Wrapper for the Standard Library](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2019/p0052r10.pdf)
- [N4939 — C++ Extensions for Library Fundamentals, Version 3](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2023/n4939.html)
