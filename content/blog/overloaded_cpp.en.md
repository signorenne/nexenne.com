---
title: "overloaded in C++"
lang: en
date: 2026-06-19
desc: "Use several lambdas as one visitor to make std::visit easier to read."
read: "4 min"
tags: ["C++", "Types"]
categories: ["Programming", "Tutorial"]
image: "/blog/covers/overloaded_cpp.webp"
translated_from: it
auto_translated: false
---
## Introduction
`std::variant` is useful when a value can take one of several known forms.
The set of alternatives is closed, the compiler knows every possible type at compile time, and `std::visit` lets the code handle the active value in a typed way.

The less pleasant part is often writing the visitor.
If the block of code is short and local, creating a dedicated `struct` can feel excessive.
If a generic lambda is used instead, the code stays compact but loses precision: it is no longer immediately clear which types have specific behavior and which ones follow the same path.

`overloaded` is a tiny helper that makes this case easier to express.
It takes several lambdas and presents them as a single object with several overloads of `operator()`.
In practice, it makes it possible to write a local visitor without introducing a separate class and without giving up the clarity of explicit cases.

## The problem
A useful example is a small event system.
Each event has a different shape, but the code that handles it wants to work with a single value.

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

With `std::visit`, the code can react to the type stored inside the `variant`.
A generic lambda, however, puts every case in the same branch.

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

That is fine if the behavior is truly identical for every alternative.
As soon as one type needs different handling, though, the generic lambda becomes an inexpressive place.
From there, it is easy for `if constexpr`, traits, type checks, and other details to appear and make the dispatch harder to read.

The problem is not `std::visit`.
The problem is that several local behaviors are needed, but moving that code into a separate structure just to name three small functions would not help much.

## One overload set from several lambdas
The helper is almost the whole story.

```cpp
template <typename... Ts>
struct overloaded : Ts... {
  using Ts::operator()...;
};

template <typename... Ts>
overloaded(Ts...) -> overloaded<Ts...>;
```

`overloaded` inherits from every lambda it receives.
Each lambda brings its own `operator()`, and `using Ts::operator()...` makes all of them available in the same overload set.

The final deduction guide avoids spelling the types by hand.
The code can use `overloaded{lambda1, lambda2, lambda3}` and let the compiler deduce the rest.

The result is an object that `std::visit` can call by selecting the best overload for the type stored in the `variant`.
The visitor stays where it is needed, but each alternative still has a recognizable branch.

## An example with std::visit
With `overloaded`, the branches stay isolated.

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

There is no need to look for a dedicated `struct`: the visitor is next to the `visit`, and each alternative has an explicit branch.
If a new type were added to the `variant` in the future, the compiler could help find the places that need to be updated.

That is one of the most practical advantages of the pattern.
The code stays compact, but it does not become indistinct.
When the `visit` is read, the existing cases and the behavior attached to each one are visible immediately.

## Specific branches and fallbacks
Specific branches and generic fallbacks can be combined.
That is useful when one or two types need dedicated handling while the others share the same behavior.

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

The more specific overload wins over the generic lambda.
In this case, `resize` enters the dedicated branch, while `click` and `key_press` use the fallback.

This is a convenient pattern, but it should be used with care.
A fallback that is too broad can hide alternatives that deserved an explicit branch.
It is often better to handle every type explicitly, especially when the meaning of the alternatives is part of the code's readability.

## When to use it
`overloaded` works well when the visitor is local and short.
It is suitable for formatting a value, converting an event, applying a small transformation, or separating a few typed branches.

It is less suitable when the visitor has complex state, private helpers, or logic reused in several places.
In that case, a `struct` with a clear name communicates the intention better and gives growing logic a natural home.

The practical rule is simple: if the block of code grows until it takes half the function, it probably deserves a dedicated type.
If the visitor really belongs at that point in the code, `overloaded` helps keep it nearby without making it opaque.

## Conclusion
`overloaded` does not change how `std::variant` works.
It only makes it more natural to write the visitor where it is used.

It is a simple helper, but it helps write clear code without hiding important branches and information.
The result is a more readable `std::visit`, especially when the dispatch is local and the behavior of each alternative should be explicit.
