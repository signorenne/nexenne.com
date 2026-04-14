---
title: "Strong Types in C++23: Making Domain Meaning Explicit"
lang: en
translated_from: it
auto_translated: false
date: 2026-04-14
lastmod: 2026-07-03
desc: "Using distinct types to turn domain mistakes into compile-time errors."
read: "5 min"
tags: ["C++", "Type Safety"]
categories: ["Programming", "Tutorial"]
image: "/blog/covers/strong_type_cpp.jpg"
---

## Abstract

While reviewing a few APIs, I noticed that many calls were valid to the compiler but ambiguous to the reader. Two `double` parameters could mean width and height, radius and diameter, or quantities expressed in different units. Swapping them did not produce a type error. It produced a bug.

An alias declared with `using` improves the name, but it does not create a new identity. If `width` and `height` are both aliases of `double`, the compiler still sees the same type.

A strong type creates a semantic barrier instead. It wraps the underlying value in a distinct type and exposes only the operations that make sense for that domain. In this article, we will build a small, self-contained C++23 wrapper without presenting it as a standard-library facility.

## The problem with primitive types

Consider a rectangle described by two `double` values.

```cpp
struct rectangle {
  rectangle(double width, double height);
};
```

Both `rectangle{800.0, 600.0}` and `rectangle{600.0, 800.0}` are valid calls. The compiler does not know what the values mean, so it cannot diagnose an accidental swap.

Parameter names help inside the declaration, but they do not participate in overload resolution. The same limitation appears if we try to distinguish two `circle` constructors:

```cpp
struct circle {
  explicit circle(double radius);
  explicit circle(double diameter); // same signature: circle(double)
};
```

The problem is not `double` itself. The problem is asking one type to represent several concepts without preserving their identity.

## An alias is not enough

The following looks more descriptive, but it does not change the type system:

```cpp
using width = double;
using height = double;

static_assert(std::same_as<width, height>);
```

`width` and `height` remain synonyms for `double`. They can still be swapped, added, or passed to the wrong function without a diagnostic.

A real barrier requires a new type. We could write a separate class for every concept, but most of the implementation would be repeated. A parameterized wrapper lets us reuse the mechanism while a tag keeps each semantic identity distinct.

## A minimal implementation

The following `strong_type` stores a value of type `T` and uses `Tag` solely to create a separate identity. The tag carries no data; it is a phantom type.

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

  constexpr explicit strong_type(T value)
      noexcept(std::is_nothrow_move_constructible_v<T>)
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

  friend constexpr auto operator==(strong_type const&,
                                   strong_type const&) -> bool = default;
  friend constexpr auto operator<=>(strong_type const&,
                                    strong_type const&) = default;

private:
  T m_value;
};
```

The constructor is `explicit`, so a raw value cannot enter the domain accidentally. Access to the stored value is explicit as well through `value()`. Equality and ordering are available when the underlying type supports them, but arithmetic, conversions, and stream operations are not forwarded automatically.

That restraint is deliberate. A strong type should not inherit every operation of `T` merely because it can. It should expose the operations that are meaningful for the concept it represents.

## Rewriting the example

We can now define separate tags for width and height.

```cpp
struct width_tag {};
struct height_tag {};

using width = strong_type<double, width_tag>;
using height = strong_type<double, height_tag>;

class rectangle final {
public:
  constexpr rectangle(width w, height h) noexcept
      : m_width{w}, m_height{h} {}

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

The call site now states its intent, and swapping the arguments becomes a compilation error. The same mechanism gives radius and diameter genuinely distinct overloads:

```cpp
struct radius_tag {};
struct diameter_tag {};

using radius = strong_type<double, radius_tag>;
using diameter = strong_type<double, diameter_tag>;

class circle final {
public:
  constexpr explicit circle(radius r) noexcept : m_radius{r} {}

  constexpr explicit circle(diameter d) noexcept
      : m_radius{radius{d.value() / 2.0}} {}

private:
  radius m_radius;
};
```

These constructors differ because `radius` and `diameter` are not aliases of one type. They are different `strong_type` specializations.

## Adding only meaningful operations

Suppose two distances should be addable. We can define that operation for the distance domain without enabling it for every strong type.

```cpp
struct meters_tag {};
using meters = strong_type<double, meters_tag>;

[[nodiscard]] constexpr auto operator+(meters lhs, meters rhs) noexcept
    -> meters {
  return meters{lhs.value() + rhs.value()};
}

constexpr auto total{meters{12.5} + meters{7.5}};
static_assert(total == meters{20.0});
```

Multiplying two widths, adding a width to a height, or implicitly converting from `double` remains unavailable. A larger library may organize these capabilities through policies or mixins, but the rule should remain opt-in.

## Limits to consider

Strong types improve API safety, but they introduce design decisions of their own:

- conversions and operators need explicit domain semantics;
- serialization, formatting, and hashing do not appear automatically;
- `std::common_type` should not be specialized without a precise meaning;
- layout, ABI, and abstraction cost should be verified in context rather than assumed;
- wrapping every value can become noise when the domain gains nothing from the distinction.

C++23 also does not provide a `std::strong_type`. “Strong type” or “strong typedef” names an idiom. WG21 papers on opaque and named types have documented the problem for years, but the wrapper shown here remains application code.

## Conclusion

A strong type turns information that previously lived only in the programmer's head into a rule the compiler can check. Width and height may share one representation, but that does not make them interchangeable.

The point is not to wrap every number in a class. It is to recognize domain boundaries where the wrong conversion, operation, or argument order would have a real consequence. At those boundaries, a small explicit type can eliminate an entire class of errors before the program runs.

## References

- [N2141 — Strong Typedefs in C++09 (Revisited)](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2006/n2141.html)
- [P0027R0 — Named Types](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2015/p0027r0.pdf)
