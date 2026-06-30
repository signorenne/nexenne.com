---
title: "Scope guard in C++"
lang: it
date: 2026-06-27
desc: "Usare RAII per tenere il rollback vicino allo stato da proteggere."
read: "4 min"
tags: ["C++", "RAII"]
categories: ["Programmazione", "Tutorial"]
image: "/blog/covers/scope_guard_cpp.webp"
---
## Introduzione
Molte funzioni sembrano semplici finché non si presenta il primo errore.
Modificano uno stato, fanno qualche controllo e, se qualcosa dovesse andare storto, devono riportare tutto al punto di partenza e lasciare il programma in uno stato coerente.

La fragilità nasce quando il rollback deve essere scritto in ogni singolo percorso di uscita.
All'inizio sembra tutto gestibile: un `return`, un controllo, una chiamata di ripristino.
Poi arriva un altro `return`, un controllo in più e magari un'eccezione.
A quel punto la garanzia di cleanup non è più una regola visibile, ma un dettaglio distribuito nella funzione, che chi modifica il codice deve ricordarsi di preservare.

Lo scope guard serve a rendere esplicita questa regola.
Quando si entra in uno scope delicato, si dichiara subito cosa deve succedere se l'operazione non arriva alla conclusione corretta.
Se il percorso felice viene raggiunto, il guard viene disattivato; se invece la funzione esce prima, il rollback viene eseguito automaticamente.

## Il problema
Il caso di partenza è una funzione che aggiunge un batch di valori a un log.
La regola è semplice: se tutti i valori sono validi, il batch viene accettato; se compare un valore non valido, il log deve tornare alla dimensione iniziale.

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

Il codice funziona, ma il contratto è fragile.
Il rollback è scritto direttamente nel ramo di errore, quindi la garanzia dipende dal fatto che ogni nuovo percorso di uscita ripeta lo stesso gesto.
Se in futuro si aggiungesse un altro controllo, bisognerebbe ricordarsi di chiamare di nuovo `resize`.

Il punto è che la funzione promette una cosa precisa: o completa tutto correttamente, oppure torna allo stato iniziale.
Quella promessa dovrebbe avere un posto stabile nel codice, vicino allo stato che il rollback deve proteggere.

## Portare la garanzia nello scope
Il pattern RAII lega una risorsa alla durata di un oggetto.
Quando l'oggetto esce dallo scope, il distruttore esegue il cleanup necessario: chiude un file, libera memoria, ripristina uno stato.

Uno scope guard applica la stessa idea a una singola azione.
Invece di copiare il rollback in ogni percorso di uscita, si crea un oggetto locale che sa cosa fare quando lo scope termina.
Finché il guard è attivo, uscire dallo scope significa eseguire quell'azione.

Una possibile implementazione può essere questa.

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

Il tipo contiene due informazioni: la callable da eseguire e un flag che dice se il guard è ancora armato.
Al momento della distruzione, se il flag è attivo, la callable viene invocata.
`dismiss()` rappresenta il commit: l'operazione è riuscita, quindi il rollback non deve più essere eseguito.

## L'esempio riscritto
Con uno scope guard, la logica della funzione cambia poco.
Cambia però il punto in cui vive la responsabilità del rollback.

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

Subito dopo aver salvato `mark`, si dichiara anche come tornare indietro.
Da quel momento ogni uscita anticipata passa dallo stesso meccanismo.

Il ramo di errore non deve più conoscere i dettagli del ripristino.
Si limita a interrompere l'operazione.
Il rollback resta legato allo stato che protegge, e la funzione diventa più facile da modificare senza introdurre dimenticanze.

## Quando è utile
Uno scope guard funziona bene quando il ripristino è locale e la condizione di successo è chiara.
Prima del commit il guard resta attivo; dopo il commit viene disattivato.

Esempi tipici:

- riportare un container alla dimensione precedente;
- ripristinare il valore originale di una variabile;
- annullare una registrazione se l'inizializzazione fallisce;
- rilasciare una risorsa solo se non viene trasferita altrove;
- mantenere leggibile una funzione con più uscite anticipate.

Il vantaggio principale non è ridurre il numero di righe, ma mettere la garanzia vicino al punto in cui nasce.
Chi legge il codice non deve controllare ogni percorso di uscita per capire se il rollback è stato eseguito o meno: vede subito quale stato viene protetto e quale azione lo ripristina.

## Quando evitarlo
Uno scope guard non deve sostituire ogni altra forma di gestione dello stato o delle risorse.
Se un'azione deve essere eseguita sempre, senza una condizione di commit, spesso è meglio usare un tipo RAII dedicato o un semplice `defer`.

Se invece l'operazione è una transazione, con più risorse e più fasi di commit, una lambda dentro uno scope guard può diventare troppo generica.
In quel caso conviene modellare la transazione con un tipo esplicito, con nomi e stati propri.

C'è anche un vincolo pratico: l'azione eseguita nel distruttore non dovrebbe lanciare eccezioni.
Se un distruttore lancia durante lo stack unwinding, il programma può terminare con `std::terminate`.
Per questo uno scope guard dà il meglio con azioni brevi, prevedibili e preferibilmente `noexcept`.

## Conclusione
Uno scope guard risolve un problema molto concreto: garantire che all'uscita dallo scope un'operazione venga eseguita.
È un pattern piccolo, ma sposta il rollback fuori dalla memoria di chi modifica la funzione e lo porta nel punto in cui il codice dichiara la propria promessa.
