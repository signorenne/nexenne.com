---
title: "C++23 Strong Type"
lang: en
translated_from: it
auto_translated: false
date: 2025-07-18
desc: "An introduction to strong types in C++, starting from an easy mistake to make."
read: "3 min"
tags: ["C++"]
categories: ["Programming"]
image: "/blog/covers/strong_type_cpp.jpg"
---
## Introduction
When we use naked primitive types (`int`, `double`, and similar), the meaning of values is not explicit. Code becomes more fragile: it is easy to swap two parameters and, in some cases, impossible to express the intended meaning correctly.

To understand the problem, let's start from a very common case.

```cpp

struct rectangle
{
    rectangle(double const width, double const height);
    ...
};

```

In this example nothing prevents you from accidentally swapping width and height: `rectangle(800, 600)` and `rectangle(600, 800)` are both valid for the compiler, but one of them may be semantically wrong. The problem appears only at runtime.

Let's try to make the intent clearer with different parameter names.

```cpp

struct circle
{
public:
    explicit circle(double const radius) : m_radius{radius} {}
    explicit circle(double const diameter) : m_radius{diameter/2} {} // This doesn't compile! :(
    ...
}

```

Here the two constructors have the same signature (circle(double)): only the parameter names change, and they do not participate in overloading. As a result, the code does not compile, and in any case we don't have distinct types to express Radius and Diameter.

Primitive types do not capture domain semantics. We need a way to give values an identity and make the call site self-explanatory, reducing errors and unexpected behavior.

For this we introduce strong, self-explanatory types: `Width`, `Height`, `Radius`, `Diameter`, and so on. In the sections that follow we will look at a C++23 header-only library, `st::strong_type<T, Tag, Ability...>`, where `Tag` separates semantic axes and the `Ability` mixins enable only the desired operators in opt-in mode. This way the compiler helps us express intent and prevent entire classes of bugs.

## What is a strong type? {#cos-è-uno-strong-type}

A **strong type** is a type wrapper that replaces an underlying type to make the semantics explicit **at the type level** (not just in the parameter name).
With st::strong_type&lt;T, Tag, Ability...&gt; we "brand" a T with a Tag (phantom type) that makes it incompatible with other values that are isomorphic but semantically different, and we enable **only** the operations declared in **opt-in** mode through the Ability mixins.

The **strong type** in code:

```cpp
namespace st {
template<class T, class Tag, template<class> class... Ability>
struct strong_type;
} // namespace st
```

-   T: underlying type (e.g. double, int, std::uint32_t, an enum...).
-   Tag: empty type that identifies the semantic axis (e.g. width_tag, height_tag).
-   Ability: **feature mixins** (opt-in operators and utilities). The ready-to-use group st::arithmetic is also available.

## How does it work?
-   Tag barrier. Binary operators between strong types are allowed only if they share the same `Tag`. Adding `Width` and `Height`? Compilation error.
-   Ability gating. Each operator/utility is protected by a `requires`: both operands must declare the required ability, and the underlying type must actually support the operation (checked at the expression level).
-   Correct constructors. From `T`: the constructor is `explicit` by default; it becomes implicit only when the conversion to `T` is safe (no narrowing). From another strong type with the same `Tag`: allowed if the underlying types are convertible; the same `explicit` rules apply.
-   Disciplined result type. Binary operators return a new strong type with: underlying = `std::common_type_t<UA, UB>`; abilities = the union of the abilities of the two operands, filtered based on the new underlying (e.g. shift only on unsigned); same `Tag`.
-   Safe shifts. Counts are normalized modulo the bit-width (with `assert` on negatives in debug), avoiding UB.
-   Saturating arithmetic. `st::sat_add` and `st::sat_sub` clamp to `min` and `max` (dedicated signed/unsigned paths) and return a type consistent with the union/filtering rules above.
-   Access and utilities. `x.value()` (lvalue/rvalue overloads), `st::to_underlying(x)` (preserves the value category), `st::clamp`, `explicit operator bool()` bool-testable style, `st::static_strong_cast(x)` (intentional cast between strong types with the same `Tag`).
-   STL integration. Consistent specializations of `std::hash`, `std::formatter` and `std::common_type` aligned with the previous rules.

## An example
This intentionally complete example shows the usefulness of a header file dedicated to strong types.

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

## Conclusion
Strong types make APIs more explicit, catch errors earlier, and control which operations are available for each value. Concrete aliases such as `using Width = st::strong_type<double, width_tag, st::arithmetic>;` make both call sites and tests clearer, because the compiler can distinguish values that share the same representation but have different meanings.
