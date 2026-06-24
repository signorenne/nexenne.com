---
title: "C++23 Strong Type"
lang: it
date: 2025-07-18
desc: "Un'introduzione agli strong type in C++ partendo da un errore facile da commettere."
read: "3 min"
tags: ["C++"]
categories: ["Programmazione"]
image: "/blog/covers/strong_type_cpp.jpg"
---
## Introduzione
Quando usiamo tipi primitivi “nudi” (`int`, `double` e simili), il significato dei valori non è esplicito. Il codice diventa più fragile: è facile scambiare due parametri e, in alcuni casi, non è nemmeno possibile rappresentare correttamente l'intento.

Per capire il problema, partiamo da un caso molto comune.

```cpp

struct rectangle
{
    rectangle(double const width, double const height);
    ...
};

```

In questo esempio nulla impedisce di invertire accidentalmente larghezza e altezza: `rectangle(800, 600)` e `rectangle(600, 800)` sono entrambi validi per il compilatore, ma uno dei due potrebbe essere semanticamente errato. Il problema emerge soltanto durante l'esecuzione.

Proviamo allora a rendere l’intento più chiaro con nomi diversi.

```cpp

struct circle
{
public:
    explicit circle(double const radius) : m_radius{radius} {}
    explicit circle(double const diameter) : m_radius{diameter/2} {} // This doesn't compile! :(
    ...
}

```

Qui i due costruttori hanno la stessa firma, `circle(double)`: cambiano soltanto i nomi dei parametri, che non partecipano alla risoluzione dell'overload. Il codice quindi non compila e continuiamo a non avere tipi distinti per rappresentare raggio e diametro.

I tipi primitivi non rappresentano la semantica del dominio. Serve un modo per dare un'identità ai valori e rendere esplicito il significato nel punto di chiamata, riducendo errori ed effetti inattesi.

Per questo introduciamo tipi “forti” e auto-esplicativi: Width, Height, Radius, Diameter, e così via. Nelle sezioni che seguono analizzeremo una libreria header-only per C++23, st::strong_type&lt;T, Tag, Ability...&gt;, in cui Tag separa gli “assi semantici”, mentre le Ability abilitano in modalità opt-in solo gli operatori desiderati (aritmetici, di stream, bitwise, saturating). Così il compilatore ci aiuta a esprimere l’intento e a prevenire intere classi di bug.

## Cos’è uno strong type? {#cos-è-uno-strong-type}

Uno **strong type** è un wrapper di tipo che sostituisce un tipo sottostante per rendere esplicita la semantica **a livello di tipo** (non solo nel nome del parametro).
Con st::strong_type&lt;T, Tag, Ability...&gt; “marchiamo” un T con un Tag (phantom type) che lo rende incompatibile con altri valori isomorfi ma semanticamente diversi, e abilitiamo **solo** le operazioni dichiarate in modo **opt-in** tramite le Ability.

Lo **strong type** nel codice:

```cpp
namespace st {
template<class T, class Tag, template<class> class... Ability>
struct strong_type;
} // namespace st
```

- T: tipo sottostante (es. double, int, std::uint32_t, un enum...).
- Tag: tipo vuoto che identifica l’asse semantico (es. width_tag, height_tag).
- Ability: **feature mixins** (operatori e utility opt-in). È disponibile anche il gruppo pronto all’uso st::arithmetic.

## Come funziona?
- Tag barrier. Gli operatori binari tra strong type sono ammessi solo se condividono lo stesso `Tag`. Sommare `Width` e `Height`? Errore di compilazione.
- Ability gating. Ogni operatore/utility è protetto da un `requires`: entrambi gli operandi devono dichiarare l’abilità richiesta e l’underlying deve supportare davvero l’operazione (verifica sull’espressione).
- Costruttori corretti. Da `T`: il costruttore è `explicit` per default; diventa implicito solo quando la conversione a `T` è sicura (nessun narrowing). Da un altro strong type con lo stesso `Tag`: consentito se gli underlying sono convertibili; valgono le stesse regole di `explicit`.
- Tipo di risultato disciplinato. Gli operatori binari restituiscono un nuovo strong type con: underlying = `std::common_type_t<UA, UB>`; abilità = unione delle abilità dei due operandi, filtrate in base al nuovo underlying (es. lo shift solo su unsigned); stesso `Tag`.
- Shift sicuri. I conteggi sono normalizzati modulo la bit width (con `assert` sui negativi in debug), evitando UB.
- Aritmetica saturante. `st::sat_add` e `st::sat_sub` fanno clamp a `min` e `max` (percorsi dedicati per signed/unsigned) e restituiscono un tipo coerente con le regole di unione/filtraggio sopra.
- Accesso e utilità. `x.value()` (overload lvalue/rvalue), `st::to_underlying(x)` (preserva la value category), `st::clamp`, `explicit operator bool()` in stile bool-testable, `st::static_strong_cast(x)` (cast intenzionale tra strong type con lo stesso `Tag`).
- Integrazione STL. Specializzazioni coerenti di `std::hash`, `std::formatter` e `std::common_type` in linea con le regole precedenti.

## Un esempio
Questo esempio, volutamente completo, mostra l'utilità di un header file dedicato agli strong type.

```cpp
#include <cstdint>
#include <expected>
#include <format>
#include <iostream>
#include <limits>
#include <numeric>
#include <print>
#include <ranges>
#include <sstream>
#include <string_view>
#include <unordered_map>
#include <vector>

#include "strong.h"

// tags
struct distance_tag
{};
struct time_tag
{};
struct flag_bits_tag
{};
struct counter_tag
{};

// strong aliases
using meters
    = st::strong_type<int, distance_tag, st::arithmetic, st::equality_comparable, st::three_way_comparable, st::ostream_insertable>;

using meters64 = st::
    strong_type<long long, distance_tag, st::arithmetic, st::equality_comparable, st::three_way_comparable, st::ostream_insertable>;

using meters_d = st::
    strong_type<double, distance_tag, st::arithmetic, st::equality_comparable, st::three_way_comparable, st::ostream_insertable>;

using seconds = st::
    strong_type<int, time_tag, st::equality_comparable, st::three_way_comparable, st::ostream_insertable, st::istream_extractable>;

using flags = st::strong_type<std::uint8_t,
                              flag_bits_tag,
                              st::bitwise_and,
                              st::bitwise_and_assign,
                              st::bitwise_or,
                              st::bitwise_or_assign,
                              st::bitwise_xor,
                              st::bitwise_xor_assign,
                              st::bitwise_not,
                              st::shift_left,
                              st::shift_left_assign,
                              st::shift_right,
                              st::shift_right_assign,
                              st::ostream_insertable>;

using flag_mask = st::strong_type<std::uint8_t,
                                  flag_bits_tag,
                                  st::bitwise_and,
                                  st::bitwise_or,
                                  st::bitwise_xor,
                                  st::bitwise_not,
                                  st::shift_left,
                                  st::shift_right,
                                  st::ostream_insertable,
                                  st::bitops_extras>;

using meters_u
    = st::strong_type<unsigned, distance_tag, st::arithmetic, st::saturating, st::equality_comparable, st::ostream_insertable>;

using meters_s_sat
    = st::strong_type<int, distance_tag, st::arithmetic, st::saturating, st::equality_comparable, st::ostream_insertable>;

using counter = st::strong_type<int, counter_tag, st::arithmetic, st::bool_testable, st::ostream_insertable>;

// helpers
[[nodiscard]] auto average_distance(const std::vector<meters> &path) -> std::expected<meters_d, std::string_view>
{
    if (path.empty())
        return std::unexpected{"empty path"};
    const auto total = std::accumulate(
        path.begin(), path.end(), meters{0}, [](const meters &a, const meters &b) -> meters { return a + b; });
    return st::static_strong_cast<meters_d>(total) / static_cast<double>(path.size());
}

[[nodiscard]] auto pairwise_sum(const std::vector<meters> &a, const std::vector<meters> &b)
    -> std::expected<std::vector<meters>, std::string_view>
{
    if (a.size() != b.size())
        return std::unexpected{"size mismatch"};
    std::vector<meters> out;
    out.reserve(a.size());
    for (auto &&[x, y] : std::views::zip(a, b))
        out.push_back(x + y);
    return out;
}

auto main() -> int
{
    static_assert(std::same_as<decltype(meters{1} + meters{2}), meters>);
    static_assert(std::same_as<std::common_type_t<meters, meters64>::underlying_type, long long>);

    // extra compile-time sanity checks
    static_assert(std::is_trivially_copyable_v<meters>);
    static_assert(sizeof(flags) == sizeof(std::uint8_t));

    // construction & conversions
    meters a = 12;
    meters b{short{30}};
    meters c = meters64{42};   // strong -> strong (same tag)
    meters_d d{meters64{100}}; // strong -> strong (same tag) to double

    std::println("a={}, b={}, c={}, d={}", a, b, c, d);

    // arithmetic + comparisons
    const auto sum{a + b};
    const auto diff{b - a};
    const auto ord{a <=> b};
    std::println("sum={}, diff={}, cmp={}", sum, diff, (ord < 0 ? "a<b" : (ord > 0 ? "a>b" : "a==b")));

    // compound ops / modulo / ++ --
    auto mwork = meters{5};
    ++mwork;
    mwork++;
    mwork -= meters{1};
    mwork += meters{3};
    mwork %= meters{4};
    std::println("mwork after ops = {}", mwork);

    // scalar rebind (multiply/divide)
    const auto scaled = a * 2.5;
    const auto halved = scaled / 2.0;
    std::println("scaled={}, halved={}", scaled, halved);

    // clamp, unary -, cast, to_underlying
    const auto lo{meters{5}}, hi{meters{25}};
    std::println("clamp({}, {}, {}) = {}", a, lo, hi, st::clamp(a, lo, hi));
    std::println("unary_minus(-{}) = {}", lo, -lo);
    std::println("static_strong_cast<double> = {}", st::static_strong_cast<meters_d>(a));
    std::println("sum as raw int: {}", st::to_underlying(sum));

    // streams & parsing
    std::istringstream iss{"77"};
    seconds t{0};
    iss >> t;
    std::println("parsed seconds = {}", t);

    // unordered_map / hash
    std::unordered_map<meters, std::string_view> names;
    names.emplace(a, "start");
    names.emplace(b, "end");
    std::println("names[a] = {}", names.at(a));

    // bitwise flags
    auto f = flags{std::uint8_t{0b0101}};
    const auto g = flags{std::uint8_t{0b0011}};
    f |= g;
    f &= flags{std::uint8_t{0b0110}};
    f ^= flags{std::uint8_t{0b0010}};
    f <<= 42; // 42 % 8 = 2
    f >>= 2;
    std::println("flags final = {}", f);

    // bit-ops extras
    const auto mk = flag_mask{std::uint8_t{0b1101}};
    std::println("mask={}, popcount={}, bit_width={}", mk, st::popcount(mk), st::bit_width(mk));
    std::println("rotl({}, 3)={}, rotr({}, 2)={}", mk, st::rotl(mk, 3), mk, st::rotr(mk, 2));
    std::println("countl_zero={}, countl_one={}, countr_zero={}, countr_one={}",
                 st::countl_zero(mk),
                 st::countl_one(mk),
                 st::countr_zero(mk),
                 st::countr_one(mk));

    // saturating arithmetic (unsigned + signed)
    const auto umax_less = meters_u{std::numeric_limits<unsigned>::max() - 5u};
    const auto uplus = meters_u{100u};
    const auto usat = st::sat_add(umax_less, uplus);
    std::println("sat_add({}, {}) = {}", umax_less, uplus, usat);

    const auto smin = meters_s_sat{std::numeric_limits<int>::min() + 10};
    const auto sneg = meters_s_sat{-1000};
    const auto ssat = st::sat_sub(smin, sneg);
    std::println("sat_sub({}, {}) = {}", smin, sneg, ssat);

    // ranges / expected
    const std::vector<meters> path{meters{3}, meters{4}, meters{5}, meters{6}};
    if (auto avg = average_distance(path))
    {
        std::println("average(path) = {}", *avg);
    }
    else
    {
        std::println("average(path) error: {}", avg.error());
    }
    const std::vector<meters> p2{meters{7}, meters{8}, meters{9}, meters{10}};
    if (auto summed = pairwise_sum(path, p2))
    {
        std::println("pairwise_sum size={}, last={}", summed->size(), summed->back());
    }
    else
    {
        std::println("pairwise_sum error: {}", summed.error());
    }

    // bool_testable
    counter cnt{2};
    if (cnt)
    {
        std::println("counter {} is truthy", cnt);
    }
    --cnt;
    --cnt;
    if (!static_cast<bool>(cnt))
    {
        std::println("counter {} is falsy", cnt);
    }

    return 0;
}

// Application output
/*
parsed seconds = 77
names[a] = start
flags final = 4
mask=13, popcount=3, bit_width=4
rotl(13, 3)=104, rotr(13, 2)=67
countl_zero=4, countl_one=0, countr_zero=0, countr_one=1
sat_add(4294967290, 100) = 4294967295
sat_sub(-2147483638, -1000) = -2147482638
average(path) = 4.5
pairwise_sum size=4, last=16
counter 2 is truthy
counter 0 is falsy
*/

```

## Conclusione
Gli strong type permettono di costruire API più esplicite, rilevare prima gli errori e controllare quali operazioni siano disponibili per ciascun valore. Alias concreti come `using Width = st::strong_type<double, width_tag, st::arithmetic>;` rendono più chiari sia il punto di chiamata sia i test, perché il compilatore può distinguere valori identici nella rappresentazione ma diversi nel significato.
