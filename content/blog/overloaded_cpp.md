---
title: "overloaded in C++"
lang: it
date: 2026-06-19
desc: "Usare più lambda come un unico visitor per rendere std::visit più leggibile."
read: "4 min"
tags: ["C++", "Types"]
categories: ["Programmazione", "Tutorial"]
image: "/blog/covers/overloaded_cpp.webp"
---
## Introduzione
`std::variant` è un'utility molto comoda quando un valore può assumere una tra più forme note.
Il set di alternative è chiuso, il compilatore conosce in fase di compilazione tutti i tipi possibili e `std::visit` permette di gestire il valore corrente in modo tipizzato.

La parte meno piacevole, spesso, è scrivere il visitor.
Se il blocco di codice è corto e locale, creare una `struct` dedicata può sembrare eccessivo.
Se invece si usa una lambda generica, il codice resta compatto ma perde precisione: non è più immediato capire quali tipi hanno un comportamento specifico e quali, invece, seguono lo stesso percorso.

`overloaded` è un helper molto piccolo che rende questo caso più semplice da esprimere.
Prende più lambda e le presenta come un unico oggetto con più overload di `operator()`.
Di fatto, permette di scrivere un visitor locale senza introdurre una classe separata e senza rinunciare alla chiarezza dei casi espliciti.

## Il problema
Un esempio utile è un piccolo sistema di eventi.
Ogni evento ha una forma diversa, ma il codice che lo gestisce vuole lavorare con un solo valore.

```cpp
#include <variant>

struct click final {
  int x{};
  int y{};
};

struct key_press final {
  char key{};
};

struct resize final {
  int width{};
  int height{};
};

using event = std::variant<click, key_press, resize>;
```

Con `std::visit` si può reagire al tipo contenuto nel `variant`.
Una lambda generica, però, mette tutti i casi nello stesso ramo.

```cpp
auto handle(event const& value) -> void {
  std::visit(
    [](auto const& current) {
      handle_event(current);
    },
    value
  );
}
```

Questo va bene se il comportamento è davvero identico per tutte le alternative.
Appena un tipo richiede una gestione diversa, però, la lambda generica diventa un punto poco espressivo.
Da lì iniziano facilmente a comparire `if constexpr`, trait, controlli sui tipi e dettagli che rendono meno chiaro il dispatch.

Il problema non è `std::visit`.
Il problema è che servono più comportamenti locali, ma non conviene spostare quel codice in una struttura separata solo per dare un nome a tre funzioni piccole.

## Un overload set da più lambda
L'helper è quasi tutto qui.

```cpp
template <typename... Ts>
struct overloaded : Ts... {
  using Ts::operator()...;
};

template <typename... Ts>
overloaded(Ts...) -> overloaded<Ts...>;
```

`overloaded` eredita da tutte le lambda ricevute.
Ogni lambda porta con sé il proprio `operator()`, e `using Ts::operator()...` li rende disponibili nello stesso overload set.

La deduction guide finale evita di scrivere i tipi manualmente.
Si può usare `overloaded{lambda1, lambda2, lambda3}` e lasciare che il compilatore deduca il resto.

Il risultato è un oggetto che `std::visit` può chiamare scegliendo l'overload più adatto al tipo contenuto nel `variant`.
Il visitor rimane nel punto in cui serve, ma ogni alternativa continua ad avere un ramo riconoscibile.

## Un esempio con std::visit
Con `overloaded`, i rami restano isolati.

```cpp
#include <format>
#include <string>

auto describe(event const& value) -> std::string {
  return std::visit(
    overloaded{
      [](click const& current) {
        return std::format("click at ({}, {})", current.x, current.y);
      },
      [](key_press const& current) {
        return std::format("key '{}' pressed", current.key);
      },
      [](resize const& current) {
        return std::format(
          "resize to {}x{}",
          current.width,
          current.height
        );
      },
    },
    value
  );
}
```

Non serve cercare una `struct` dedicata: il visitor è accanto alla `visit`, e ogni alternativa ha un ramo esplicito.
Se in futuro venisse aggiunto un nuovo tipo al `variant`, il compilatore potrebbe aiutare a trovare i punti da aggiornare.

Questo è uno dei vantaggi più pratici del pattern.
Il codice resta compatto, ma non diventa indistinto.
Quando si legge la `visit`, si vede subito quali casi esistono e quale comportamento è associato a ciascuno.

## Rami specifici e fallback
Si possono combinare rami specifici e fallback generici.
È utile quando uno o due tipi hanno una gestione dedicata, mentre gli altri condividono lo stesso comportamento.

```cpp
auto category(event const& value) -> std::string {
  return std::visit(
    overloaded{
      [](resize const&) {
        return std::string{"layout"};
      },
      [](auto const&) {
        return std::string{"input"};
      },
    },
    value
  );
}
```

L'overload più specifico vince sulla lambda generica.
In questo caso `resize` entra nel ramo dedicato, mentre `click` e `key_press` finiscono nel fallback.

Questo è un pattern comodo, ma va usato con attenzione.
Un fallback troppo generico può nascondere alternative che meritavano un ramo esplicito.
Spesso, quindi, è meglio gestire ogni tipo in modo esplicito, soprattutto quando il significato delle alternative fa parte della leggibilità del codice.

## Quando usarlo
`overloaded` funziona bene quando il visitor è locale e breve.
È adatto per formattare un valore, convertire un evento, applicare una piccola trasformazione o separare pochi rami tipizzati.

È meno adatto quando il visitor ha uno stato complesso, helper privati o logica riusata in più punti.
In quel caso una `struct` con un nome chiaro comunica meglio l'intenzione e dà uno spazio naturale alla logica che cresce.

La regola pratica è semplice: se il blocco di codice cresce fino a occupare mezza funzione, probabilmente merita un tipo dedicato.
Se invece il visitor appartiene davvero a quel punto del codice, `overloaded` aiuta a tenerlo vicino senza renderlo opaco.

## Conclusione
`overloaded` non cambia il funzionamento di `std::variant`.
Si limita a rendere più naturale scrivere il visitor dove viene usato.

È un helper semplice, ma aiuta a scrivere codice chiaro senza nascondere rami e informazioni importanti.
Il risultato è una `std::visit` più leggibile, soprattutto quando il dispatch è locale e il comportamento di ogni alternativa deve essere esplicito.
