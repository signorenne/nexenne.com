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
`std::variant` is useful when a value can hold one of several known types.
The set of alternatives is closed, the compiler knows every case, and `std::visit` lets us handle the active value in a typed way.

The awkward part appears when the visitor is small.
Creating a dedicated `struct` for three local branches can feel heavy.
Using a generic lambda is compact, but it also hides some intent: the reader can no longer see which cases are actually special.

`overloaded` is a tiny helper for that exact problem.
It takes several lambdas and turns them into one object with several overloads of `operator()`.
In practice, it gives us a local visitor without forcing us to declare a separate class.

## The Problem
Imagine a small event system.
Each event has a different shape, but the consuming code wants to treat it as one value.

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

With `std::visit`, we can react to the type stored inside the `variant`.
If we write a generic lambda, though, every case ends up in the same branch.

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

That is fine when the behavior is truly identical.
As soon as some types need different logic, the generic lambda becomes a vague place.
It tends to grow `if constexpr`, traits, type checks, and noise that does not belong to the problem.

## One Overload Set From Several Lambdas
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
Each lambda has its own `operator()`, and `using Ts::operator()...` brings all of them into the same overload set.

The final deduction guide avoids spelling the types by hand.
We can write `overloaded{lambda1, lambda2, lambda3}` and let the compiler deduce the rest.

The result is an object that `std::visit` can call by selecting the best overload for the type stored in the `variant`.

## An Example With std::visit
With `overloaded`, the branches stay close to the place where they are needed.

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

There is no need to look for a `struct` somewhere else.
The visitor is right where it is used, and each alternative has an explicit branch.
If we add a new type to the `variant`, the compiler can help us find the visits that need to be updated.

## Specific Branches And Fallbacks
We can also combine specific branches with a generic fallback.
That is useful when one or two types need dedicated handling and the others share the same behavior.

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
Here `resize` enters the dedicated branch, while `click` and `key_press` use the fallback.

This pattern should be used with care.
A fallback that is too broad can hide alternatives that deserved their own branch.
If the `variant` represents an important protocol, handling every type explicitly is often clearer.

## When To Use It
`overloaded` fits well when the visitor is local and short.
It works nicely for formatting a value, converting an event, applying a small transformation, or separating a few typed branches.

It is less useful when the visitor has complex state, private helpers, or logic that must be reused in several places.
In that case, a named `struct` communicates intent better.

The practical rule is simple: if the visitor belongs next to `std::visit`, `overloaded` makes the code more direct.
If the block grows and starts taking half the function, it is time to give it a dedicated type.

## Conclusion
`overloaded` does not change how `std::variant` works.
It just makes it more natural to write the visitor where it is needed.

It is one of those small helpers that does not try to hide C++.
It removes ceremony, keeps the important branches visible, and makes `std::visit` easier to use in everyday code.
