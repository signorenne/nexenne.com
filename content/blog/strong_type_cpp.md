---
title: "Strong type in C++23: rendere esplicita la semantica"
lang: it
date: 2026-04-14
lastmod: 2026-07-03
desc: "Usare tipi distinti per trasformare errori di dominio in errori di compilazione."
read: "5 min"
tags: ["C++", "Type Safety"]
categories: ["Programmazione", "Tutorial"]
image: "/blog/covers/strong_type_cpp.jpg"
---

## Abstract

Durante la revisione di alcune API mi sono accorto che molte chiamate erano corrette per il compilatore, ma ambigue per chi leggeva il codice. Due parametri `double` potevano rappresentare larghezza e altezza, raggio e diametro oppure grandezze espresse in unità differenti. Scambiarli non produceva un errore di tipo: produceva un bug.

Un alias creato con `using` migliora il nome, ma non crea una nuova identità. Se `width` e `height` sono entrambi alias di `double`, per il compilatore rimangono lo stesso tipo.

Uno strong type introduce invece una barriera semantica. Incapsula il valore sottostante in un tipo distinto e rende disponibili soltanto le operazioni sensate per quel dominio. In questo articolo costruiremo un wrapper minimale e auto-contenuto in C++23, senza confonderlo con una facility della libreria standard.

## Il problema dei tipi primitivi

Consideriamo un rettangolo definito da due `double`.

```cpp
struct rectangle {
  rectangle(double width, double height);
};
```

Le chiamate `rectangle{800.0, 600.0}` e `rectangle{600.0, 800.0}` sono entrambe valide. Il compilatore non conosce il significato dei due valori, quindi non può rilevare un'inversione accidentale.

I nomi dei parametri aiutano dentro la dichiarazione, ma non partecipano alla risoluzione degli overload. Lo stesso limite emerge se proviamo a distinguere due costruttori di `circle`:

```cpp
struct circle {
  explicit circle(double radius);
  explicit circle(double diameter);  // stessa firma: circle(double)
};
```

Il problema non è il `double` in sé. È il fatto che stiamo chiedendo a un tipo di rappresentare più concetti senza conservare la loro identità.

## Un alias non basta

Questa soluzione sembra più leggibile, ma non cambia il sistema di tipi:

```cpp
using width = double;
using height = double;

static_assert(std::same_as<width, height>);
```

`width` e `height` sono sinonimi di `double`. Possiamo ancora scambiarli, sommarli o passarli alla funzione sbagliata senza alcuna diagnosi.

Per ottenere una barriera reale serve un nuovo tipo. Possiamo scrivere una classe per ogni concetto, ma gran parte del codice sarebbe identica. Un wrapper parametrizzato permette di riutilizzare il meccanismo mantenendo distinta la semantica tramite un tag.

## Un'implementazione minimale

Il seguente `strong_type` conserva un valore di tipo `T` e usa `Tag` soltanto per creare un'identità distinta. Il tag non contiene dati: è un *phantom type*.

```cpp
#include <compare>
#include <concepts>
#include <type_traits>
#include <utility>

template <typename T, typename Tag>
class [[nodiscard]] strong_type final {
public:
  using value_type = T;
  using tag_type = Tag;

  constexpr explicit strong_type(T value) noexcept(std::is_nothrow_move_constructible_v<T>)
      : m_value{std::move(value)} {}

  [[nodiscard]] constexpr auto value() & noexcept -> T& {
    return m_value;
  }

  [[nodiscard]] constexpr auto value() const& noexcept -> T const& {
    return m_value;
  }

  [[nodiscard]] constexpr auto value() && noexcept -> T&& {
    return std::move(m_value);
  }

  friend constexpr auto operator==(strong_type const&, strong_type const&) -> bool = default;
  friend constexpr auto operator<=>(strong_type const&, strong_type const&) = default;

private:
  T m_value;
};
```

Il costruttore è `explicit`: un valore grezzo non entra accidentalmente nel dominio. L'accesso al valore è altrettanto esplicito tramite `value()`. Uguaglianza e ordinamento sono disponibili quando il tipo sottostante li supporta, ma non abbiamo inoltrato automaticamente aritmetica, conversioni o stream.

Questa scelta è intenzionale. Uno strong type non dovrebbe ereditare tutte le operazioni di `T` soltanto perché può farlo. Dovrebbe esporre quelle che hanno senso per il concetto rappresentato.

## L'esempio riscritto

Definiamo ora tag differenti per larghezza e altezza.

```cpp
struct width_tag {};

struct height_tag {};

using width = strong_type<double, width_tag>;
using height = strong_type<double, height_tag>;

class rectangle final {
public:
  constexpr rectangle(width w, height h) noexcept : m_width{w}, m_height{h} {}

  [[nodiscard]] constexpr auto area() const noexcept -> double {
    return m_width.value() * m_height.value();
  }

private:
  width m_width;
  height m_height;
};

static_assert(!std::same_as<width, height>);
static_assert(!std::convertible_to<double, width>);
static_assert(std::constructible_from<rectangle, width, height>);
static_assert(!std::constructible_from<rectangle, height, width>);

constexpr rectangle screen{width{800.0}, height{600.0}};
static_assert(screen.area() == 480000.0);
```

Il punto di chiamata ora dichiara l'intento e l'inversione dei parametri diventa un errore di compilazione. Lo stesso meccanismo permette di distinguere raggio e diametro con due overload reali:

```cpp
struct radius_tag {};

struct diameter_tag {};

using radius = strong_type<double, radius_tag>;
using diameter = strong_type<double, diameter_tag>;

class circle final {
public:
  constexpr explicit circle(radius r) noexcept : m_radius{r} {}

  constexpr explicit circle(diameter d) noexcept : m_radius{radius{d.value() / 2.0}} {}

private:
  radius m_radius;
};
```

I costruttori sono finalmente distinti perché `radius` e `diameter` non sono alias dello stesso tipo: sono specializzazioni differenti di `strong_type`.

## Operazioni disponibili solo quando servono

Supponiamo di voler sommare due distanze. Possiamo definire l'operatore per quel dominio, senza renderlo disponibile per ogni strong type.

```cpp
struct meters_tag {};

using meters = strong_type<double, meters_tag>;

[[nodiscard]] constexpr auto operator+(meters lhs, meters rhs) noexcept -> meters {
  return meters{lhs.value() + rhs.value()};
}

constexpr auto total{meters{12.5} + meters{7.5}};
static_assert(total == meters{20.0});
```

La moltiplicazione fra due larghezze, la somma fra una larghezza e un'altezza o la conversione implicita da `double` restano invece assenti. In una libreria più ampia queste capacità possono essere organizzate con policy o mixin, ma la regola dovrebbe rimanere opt-in.

## Limiti da considerare

Uno strong type migliora la sicurezza dell'API, ma introduce scelte che vanno progettate:

- bisogna decidere quali conversioni e operatori abbiano davvero senso;
- serializzazione, formattazione e hashing non arrivano automaticamente;
- `std::common_type` non dovrebbe essere specializzato senza una semantica precisa;
- layout, ABI e costo delle astrazioni vanno verificati nel contesto reale, non presunti;
- creare un tipo per ogni valore può diventare rumore se il dominio non trae beneficio dalla distinzione.

Non esiste inoltre un `std::strong_type` in C++23. “Strong type” o “strong typedef” indica un idiom; le proposte WG21 sugli opaque o named types documentano da tempo il problema, ma il wrapper mostrato qui è codice applicativo.

## Conclusione

Uno strong type serve a trasformare un'informazione presente soltanto nella testa del programmatore in una regola verificabile dal compilatore. Larghezza e altezza possono condividere la stessa rappresentazione, ma non per questo devono essere intercambiabili.

Il vantaggio non consiste nell'avvolgere ogni numero in una classe. Consiste nel riconoscere i confini del dominio in cui uno scambio, una conversione o un'operazione sbagliata avrebbe conseguenze reali. In quei punti, un piccolo tipo esplicito può eliminare un'intera categoria di errori prima ancora di eseguire il programma.

## Riferimenti

- [N2141 — Strong Typedefs in C++09 (Revisited)](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2006/n2141.html)
- [P0027R0 — Named Types](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2015/p0027r0.pdf)
