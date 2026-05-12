---
title: "Scope guard in C++"
lang: it
date: 2026-05-12
lastmod: 2026-07-10
desc: "Usare RAII per tenere il rollback vicino allo stato da proteggere."
read: "5 min"
tags: ["C++", "RAII"]
categories: ["Programmazione", "Tutorial"]
image: "/blog/covers/scope_guard_cpp.webp"
---

## Abstract

Durante la revisione di alcune funzioni con più percorsi di uscita, mi sono accorto che il problema non era il singolo `return`. Il vero rischio era la promessa implicita che lo accompagnava: se l'operazione non fosse arrivata al commit, qualcuno avrebbe dovuto ripristinare lo stato iniziale.

Finché il rollback compare in un solo ramo, il codice sembra semplice. Quando però arrivano un secondo controllo, un'eccezione o una nuova fase dell'operazione, quella garanzia si disperde nella funzione e diventa facile dimenticarla.

Uno scope guard porta la regola nel punto in cui nasce. Si dichiara subito come tornare indietro, si lascia che RAII gestisca ogni uscita dallo scope e si disattiva il guard soltanto dopo il commit. Vediamo dunque come costruirne uno minimale in C++20 e, soprattutto, quali limiti non conviene nascondere.

## Il problema

Supponiamo di voler aggiungere un batch di valori a un log. Il contratto è preciso: se tutti i valori sono validi, il batch viene accettato; se qualcosa fallisce, il log deve tornare alla dimensione iniziale.

```cpp
auto commit_batch(std::vector<int>& log,
                  std::vector<int> const& batch) -> bool {
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

Il codice funziona nel caso mostrato, ma il contratto è fragile. Il rollback vive direttamente nel ramo di errore, quindi ogni nuovo percorso di uscita deve ricordarsi di ripetere `log.resize(mark)`.

C'è poi un dettaglio meno visibile: anche `push_back()` può lanciare, per esempio durante un'allocazione. In quel caso la funzione esce senza attraversare il ramo che contiene il ripristino. Se vogliamo davvero una semantica del tipo “tutto oppure niente”, il cleanup non può dipendere dal percorso seguito dal controllo.

## Portare la garanzia nello scope

RAII lega un'azione alla durata di un oggetto. Quando quell'oggetto esce dallo scope, il distruttore esegue il cleanup: chiude un file, rilascia una risorsa oppure ripristina uno stato.

Uno scope guard applica lo stesso principio a un'azione locale. Il guard nasce attivo e conserva una callable. Se lo scope termina mentre è ancora armato, la callable viene eseguita; se l'operazione raggiunge il commit, `dismiss()` lo disattiva.

La differenza può sembrare piccola, ma cambia il punto in cui vive la garanzia. Il rollback non è più una conseguenza sparsa nei rami di errore: diventa un oggetto dichiarato vicino allo stato che protegge.

## Un'implementazione minimale

Per l'esempio userò un tipo volutamente piccolo e non trasferibile. Non vuole sostituire una libreria completa, ma rendere visibile il meccanismo.

```cpp
#include <concepts>
#include <functional>
#include <type_traits>
#include <utility>

template <typename Fn>
  requires std::invocable<Fn&> && std::move_constructible<Fn>
class [[nodiscard]] scope_guard final {
public:
  using function_type = Fn;

  explicit scope_guard(function_type fn)
      noexcept(std::is_nothrow_move_constructible_v<function_type>)
      : m_fn{std::move(fn)} {}

  scope_guard(scope_guard const&) = delete;
  auto operator=(scope_guard const&) -> scope_guard& = delete;
  scope_guard(scope_guard&&) = delete;
  auto operator=(scope_guard&&) -> scope_guard& = delete;

  ~scope_guard() noexcept {
    if (m_active) {
      std::invoke(m_fn);
    }
  }

  auto dismiss() noexcept -> void {
    m_active = false;
  }

private:
  function_type m_fn;
  bool m_active{true};
};

template <typename Fn>
scope_guard(Fn) -> scope_guard<Fn>;
```

Il tipo conserva la callable e un flag che indica se il guard è ancora attivo. Il vincolo usa `std::invocable<Fn&>` perché la callable memorizzata viene invocata come lvalue, non come oggetto temporaneo.

Ho eliminato sia la copia sia lo spostamento. Per un guard locale questa scelta mantiene un solo proprietario dell'azione ed evita il problema della doppia esecuzione. Un'implementazione generale può supportare lo spostamento, ma deve anche disarmare correttamente l'oggetto sorgente.

Il distruttore è `noexcept` per scelta. Di conseguenza, l'azione registrata non deve lasciare propagare eccezioni: se lo facesse, il programma terminerebbe. Non è un dettaglio secondario, ma parte del contratto del tipo.

## L'esempio riscritto

Possiamo ora spostare il rollback accanto al punto in cui salviamo lo stato iniziale.

```cpp
auto commit_batch(std::vector<int>& log,
                  std::vector<int> const& batch) -> bool {
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

Da questo momento, un valore negativo, un'eccezione o un altro `return` introdotto dopo la creazione del guard attraversano lo stesso meccanismo. Solo il percorso che completa il batch chiama `dismiss()`.

Nell'esempio il rollback riduce un `std::vector<int>` a una dimensione già raggiunta, quindi non richiede una nuova allocazione e non distrugge oggetti con distruttori fallibili. È comunque importante dichiarare le assunzioni: `batch` deve essere distinto da `log`, perché aggiungere elementi allo stesso vettore che si sta iterando potrebbe invalidare gli iteratori.

La garanzia forte non nasce dunque dal guard preso da solo. Dipende anche dal fatto che l'azione di ripristino sia affidabile e che le operazioni eseguite prima del commit abbiano una semantica compatibile con il rollback.

## Standardizzazione e implementazioni esistenti

Il concetto non è nuovo. La proposta WG21 P0052 definisce `scope_exit`, `scope_fail` e `scope_success`; il working draft del Library Fundamentals TS v3 li espone nello spazio dei nomi `std::experimental` tramite l'header `<experimental/scope>`.

La disponibilità concreta dipende però dalla libreria standard e dalla toolchain. In un progetto reale preferirei quindi una facility già mantenuta e verificata, quando disponibile, oppure una soluzione fornita dall'infrastruttura del progetto. L'implementazione precedente resta utile per comprendere il pattern e per casi locali con requisiti molto circoscritti.

## Quando usarlo

Uno scope guard funziona bene quando il ripristino è locale e il punto di commit è evidente. Alcuni casi tipici sono:

- riportare un container alla dimensione precedente;
- ripristinare temporaneamente il valore di una variabile;
- annullare una registrazione se l'inizializzazione fallisce;
- rilasciare una risorsa soltanto se non viene trasferita altrove;
- mantenere leggibile una funzione con più uscite anticipate.

Il vantaggio principale non è ridurre il numero di righe. È rendere leggibile la garanzia senza dover ricostruire mentalmente ogni percorso di controllo.

## Quando evitarlo

Se un oggetto rappresenta una risorsa con un ciclo di vita proprio, un tipo RAII dedicato comunica meglio proprietà e responsabilità. Se invece l'operazione è una transazione composta da più risorse, più stati e più fasi di commit, una lambda può diventare troppo generica: in quel caso preferisco modellare la transazione con un tipo esplicito.

Bisogna inoltre controllare la durata delle catture. Il guard viene distrutto prima degli oggetti dichiarati prima di lui, ma non può usare riferimenti a oggetti già distrutti o restituiti. Anche l'ordine di dichiarazione fa quindi parte della correttezza.

## Conclusione

Uno scope guard risolve un problema concreto: eseguire un'azione quando uno scope termina, indipendentemente dal percorso di uscita. Nel caso del rollback, permette di dichiarare subito la promessa “se non avviene il commit, torno allo stato iniziale”.

È un pattern piccolo, ma utile proprio perché sposta la correttezza dalla memoria di chi modifica la funzione alla struttura del codice. Non rende automaticamente sicura una transazione e non sostituisce un buon modello delle risorse; quando però il rollback è locale, breve e non fallibile, mantiene la garanzia nel posto in cui è più facile verificarla.

## Riferimenti

- [P0052R10 — Generic Scope Guard and RAII Wrapper for the Standard Library](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2019/p0052r10.pdf)
- [N4939 — C++ Extensions for Library Fundamentals, Version 3](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2023/n4939.html)
