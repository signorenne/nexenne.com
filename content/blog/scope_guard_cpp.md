---
title: "Scope guard in C++"
lang: it
date: 2026-06-27
desc: "Usare RAII per tenere rollback e restore dello stato vicino al codice che devono proteggere."
read: "4 min"
tags: ["C++", "RAII"]
categories: ["Programmazione", "Tutorial"]
image: "/blog/covers/scope_guard_cpp.webp"
---
## Introduzione
Ci sono funzioni che sembrano innocue finché non bisogna gestire il primo errore.
Modificano uno stato, eseguono qualche controllo e, se qualcosa va storto, devono riportare tutto com'era prima.

Il problema nasce quando questa logica di rollback finisce dentro ogni branch di uscita.
All'inizio il codice resta leggibile.
Poi arriva un secondo `return`, magari un check in più, oppure un'eccezione.
A quel punto la garanzia che volevamo mantenere non è più espressa in un posto solo: è sparsa nel corpo della funzione.

Uno scope guard serve a rendere esplicito questo vincolo.
Quando entro in uno scope delicato, dichiaro subito cosa deve succedere se l'operazione non arriva al commit.
Se il codice raggiunge il success path, disattivo il guard.
Se invece esco prima, il rollback viene eseguito automaticamente.

## Il problema
Consideriamo una funzione che aggiunge un batch di valori a un log.
La regola è semplice: se tutti i valori sono validi, il commit del batch va a buon fine; se ne compare uno non valido, il log deve tornare alla dimensione iniziale.

```cpp
auto commit_batch(std::vector<int>& log, std::vector<int> const& batch) -> bool {
  auto const mark{log.size()};

  for (auto const value : batch) {
    if (value < 0) {
      log.resize(mark);
      return false;
    }

    log.push_back(value);
  }

  return true;
}
```

Così funziona, ma la garanzia è fragile.
Il rollback è scritto direttamente nell'error branch.
Se in futuro aggiungiamo un altro check, dobbiamo ricordarci di ripetere lo stesso `resize`.

Il punto non è che `resize` sia difficile.
Il punto è che la funzione promette una cosa precisa, "o completo tutto, oppure torno allo stato iniziale", ma questa promessa non ha un punto stabile nel codice.

## Portare la garanzia nello scope
RAII nasce per legare una risorsa alla durata di un oggetto.
Quando l'oggetto esce dallo scope, il distruttore fa il lavoro necessario: chiude un file, libera una risorsa, ripristina uno stato.

Uno scope guard usa la stessa idea per una singola azione.
Invece di scrivere il rollback in ogni possibile exit path, creo un oggetto locale che conosce l'azione da eseguire.
Finché il guard resta attivo, uscire dallo scope significa eseguire quell'azione.

Una versione ridotta può essere questa.

```cpp
#include <concepts>
#include <type_traits>
#include <utility>

template <std::invocable Fn>
class [[nodiscard]] scope_guard final {
public:
  using function_type = Fn;

private:
  function_type m_fn;
  bool m_active{true};

public:
  explicit scope_guard(function_type fn
  ) noexcept(std::is_nothrow_move_constructible_v<function_type>)
      : m_fn{std::move(fn)} {}

  scope_guard(scope_guard const&) = delete;
  auto operator=(scope_guard const&) -> scope_guard& = delete;

  ~scope_guard() noexcept(noexcept(m_fn())) {
    if (m_active) {
      m_fn();
    }
  }

  auto dismiss() noexcept -> void {
    m_active = false;
  }
};

template <typename Fn>
scope_guard(Fn) -> scope_guard<Fn>;
```

Il tipo contiene solo due informazioni: la callable da eseguire e un flag che indica se il guard è ancora armato.
Alla distruzione, se il flag è attivo, la callable viene invocata.
`dismiss()` comunica il commit: l'operazione è riuscita e il rollback non deve più partire.

## L'esempio riscritto
Con uno scope guard, la funzione cambia poco, ma la responsabilità del rollback si sposta nel punto giusto.

```cpp
auto commit_batch(std::vector<int>& log, std::vector<int> const& batch) -> bool {
  auto const mark{log.size()};

  auto rollback{scope_guard{[&] {
    log.resize(mark);
  }}};

  for (auto const value : batch) {
    if (value < 0) {
      return false;
    }

    log.push_back(value);
  }

  rollback.dismiss();
  return true;
}
```

Ora il codice rende più chiaro il contratto.
Subito dopo aver salvato `mark`, dichiariamo il rollback.
Da quel momento, ogni early return passa dallo stesso meccanismo.

L'error branch non deve più conoscere i dettagli del restore dello stato.
Si limita a interrompere l'operazione.
Il rollback resta vicino allo stato che protegge, e la funzione diventa più semplice da modificare senza introdurre dimenticanze.

## Quando è utile
Uno scope guard è utile quando il restore è locale e la condizione di successo è chiara.
Prima del commit il guard deve restare attivo; dopo il commit può essere disattivato.

Esempi tipici:

- riportare un container alla dimensione precedente;
- ripristinare il valore originale di una variabile;
- annullare una registrazione se l'inizializzazione fallisce;
- rilasciare una risorsa solo se non viene trasferita altrove;
- mantenere compatta una funzione con più early return.

Il vantaggio principale non è scrivere meno righe.
Il vantaggio è mettere la garanzia vicino al punto in cui nasce.
Chi legge non deve controllare ogni branch per capire se il rollback è stato eseguito.

## Quando evitarlo
Uno scope guard non deve sostituire ogni forma di gestione delle risorse.
Se un'azione deve essere eseguita sempre, senza una condizione di commit, spesso è più chiaro usare un tipo RAII dedicato o un semplice `defer`.

Se invece l'operazione è una transazione vera, con molte risorse coinvolte e più fasi di commit, una lambda nascosta in uno scope guard può diventare troppo opaca.
In quel caso conviene modellare la transazione con un tipo esplicito, con nomi e stati propri.

C'è anche un vincolo pratico da non ignorare: l'azione eseguita nel distruttore non dovrebbe lanciare eccezioni.
Se un distruttore lancia durante lo stack unwinding, il programma può terminare con `std::terminate`.
Per questo uno scope guard funziona meglio con azioni brevi, prevedibili e preferibilmente `noexcept`.

## Conclusione
Uno scope guard è un piccolo strumento, ma risolve un problema molto concreto: evitare che il rollback venga copiato nei branch di errore.

La funzione dichiara subito come tornare indietro, poi disattiva il guard solo quando il lavoro è stato completato.
Il codice risultante è più onesto: la garanzia non vive nei commenti e non dipende dalla memoria di chi aggiungerà il prossimo branch.
